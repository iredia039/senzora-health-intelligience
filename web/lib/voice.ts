"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ApiError, apiRequest } from "@/lib/api";

/*
 * Voice has two ways to turn speech into text:
 *  - "browser": the browser's own speech tool (Chrome, Edge). Free, nothing goes through Senzora.
 *  - "recording": the page records a short clip, POST /transcribe sends it to the speech service, and the text comes back.
 *    Used where the browser tool is missing or blocked (Brave, Firefox), and as a backup when the browser tool fails.
 */

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { readonly isFinal: boolean; readonly [index: number]: RecognitionAlternative };
type RecognitionEvent = { readonly results: { readonly length: number; readonly [index: number]: RecognitionResult } };
type RecognitionErrorEvent = { readonly error: string };

type BrowserRecognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserRecognizerConstructor = new () => BrowserRecognizer;

/** Something that is listening. stop() keeps what was said. abort() throws it away. */
export type Listener = { stop: () => void; abort: () => void };

export type VoiceMode = "browser" | "recording" | "none";

let browserSpeechFailed = false;
const modeListeners = new Set<() => void>();

function getRecognizerConstructor(): BrowserRecognizerConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: BrowserRecognizerConstructor; webkitSpeechRecognition?: BrowserRecognizerConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Brave has the browser speech tool but blocks the service behind it, so it always fails there. */
function isBrave(): boolean {
  return typeof navigator !== "undefined" && "brave" in navigator;
}

function canUseBrowserSpeech(): boolean {
  return !browserSpeechFailed && !isBrave() && getRecognizerConstructor() !== null;
}

function canRecord(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function" && typeof MediaRecorder !== "undefined";
}

function currentMode(): VoiceMode {
  if (canUseBrowserSpeech()) return "browser";
  if (canRecord()) return "recording";
  return "none";
}

function markBrowserSpeechFailed(): void {
  browserSpeechFailed = true;
  modeListeners.forEach((listener) => listener());
}

function subscribeMode(onChange: () => void): () => void {
  modeListeners.add(onChange);
  return () => {
    modeListeners.delete(onChange);
  };
}

const subscribeNever = () => () => {};

/** How voice works in this browser. "none" on the server and on the first render. */
export function useVoiceMode(): VoiceMode {
  return useSyncExternalStore(subscribeMode, currentMode, () => "none");
}

/** True when this browser can read text out loud. False on the server and on the first render. */
export function useCanSpeak(): boolean {
  return useSyncExternalStore(subscribeNever, () => typeof window !== "undefined" && "speechSynthesis" in window, () => false);
}

/** A plain-language privacy line for the way voice works right now. */
export function voiceNotice(mode: VoiceMode): string {
  if (mode === "recording") return "Voice records a short clip and sends it through Senzora to a speech-to-text service (Groq). Senzora does not store the clip.";
  return "Voice uses your browser’s speech service, which may send your audio to its provider.";
}

/** A plain-language message for a voice error, or "" when the error needs no message. */
export function recognitionErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.";
    case "audio-capture":
      return "No microphone was found on this device.";
    case "network":
      return "Voice needs an internet connection. Check your network and try again.";
    case "login":
      return "Your login ended. Log in again to use voice.";
    case "busy":
      return "Too many voice requests right now. Wait a moment and try again.";
    case "unavailable":
      return "Voice transcription isn't available right now. Type your message instead.";
    case "no-speech":
    case "aborted":
      return "";
    default:
      return "Voice didn't work this time. Try again.";
  }
}

type RecognizerHandlers = {
  /** Called as words are recognised. `final` is true once the words will not change. */
  onText: (text: string, final: boolean) => void;
  onError: (code: string) => void;
  /** Called when listening is over and the clip is being turned into text (recording mode only). */
  onProcessing?: () => void;
  /** Called once when everything is finished, whatever the reason. */
  onEnd: () => void;
};

/* ---- Browser speech tool ---- */

function startBrowserSpeech(handlers: RecognizerHandlers): Listener | null {
  const Ctor = getRecognizerConstructor();
  if (!Ctor) return null;

  const recognizer = new Ctor();
  recognizer.lang = navigator.language || "en-US";
  // One phrase at a time: Android Chrome repeats words in continuous mode.
  recognizer.continuous = false;
  recognizer.interimResults = true;

  /** Set when the browser tool failed on the network and recording took over. */
  let handedOver: Listener | null = null;

  recognizer.onresult = (event) => {
    let text = "";
    let final = false;
    for (let i = 0; i < event.results.length; i += 1) {
      text += event.results[i][0].transcript;
      final = event.results[i].isFinal;
    }
    handlers.onText(text.trim(), final);
  };

  recognizer.onerror = (event) => {
    if (event.error === "network" && canRecord()) {
      markBrowserSpeechFailed();
      const next = startRecorder(handlers);
      if (next) {
        handedOver = next;
        return;
      }
    }
    handlers.onError(event.error);
  };

  recognizer.onend = () => {
    if (handedOver === null) handlers.onEnd();
  };

  try {
    recognizer.start();
  } catch {
    return null;
  }

  return {
    stop: () => (handedOver ? handedOver.stop() : recognizer.stop()),
    abort: () => (handedOver ? handedOver.abort() : recognizer.abort()),
  };
}

/* ---- Recording ---- */

/** How loud the microphone must be (0 to 1) to count as speech. */
const SPEECH_LEVEL = 0.03;
const SILENCE_AFTER_SPEECH_MS = 1400;
const NO_SPEECH_TIMEOUT_MS = 8000;
const MAX_RECORDING_MS = 30_000;
/** A recording stopped by hand needs at least this much time to be worth sending. */
const MIN_MANUAL_MS = 1200;

function errorCodeFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "login";
    if (error.status === 429) return "busy";
    if (error.status === 0) return "network";
  }
  return "unavailable";
}

function startRecorder(handlers: RecognizerHandlers): Listener | null {
  if (!canRecord()) return null;

  let cancelled = false;
  let userStopped = false;
  let ended = false;
  let heardSpeech = false;
  let startedAt = 0;
  let recorder: MediaRecorder | null = null;
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let poll: number | undefined;
  const chunks: Blob[] = [];

  const end = () => {
    if (ended) return;
    ended = true;
    handlers.onEnd();
  };

  const release = () => {
    window.clearInterval(poll);
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    if (audioContext) {
      void audioContext.close().catch(() => {});
      audioContext = null;
    }
  };

  /** Runs once the recorder has stopped: sends the clip and reports the words. */
  const finish = async (mimeType: string) => {
    release();

    const longEnough = Date.now() - startedAt >= MIN_MANUAL_MS;
    if (cancelled || chunks.length === 0 || (!heardSpeech && !(userStopped && longEnough))) {
      end();
      return;
    }

    handlers.onProcessing?.();

    try {
      const blob = new Blob(chunks, { type: mimeType });
      const lang = (navigator.language || "en").slice(0, 2).toLowerCase();
      const data = await apiRequest<{ text: string }>(`/transcribe?lang=${encodeURIComponent(lang)}`, { method: "POST", auth: true, blob });
      const text = typeof data.text === "string" ? data.text.trim() : "";
      if (text && !cancelled) handlers.onText(text, true);
    } catch (error) {
      if (!cancelled) handlers.onError(errorCodeFor(error));
    }

    end();
  };

  const begin = async () => {
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") handlers.onError("not-allowed");
      else if (name === "NotFoundError") handlers.onError("audio-capture");
      else handlers.onError("failed");
      end();
      return;
    }

    stream = media;

    // Stopped or aborted while the browser was still asking for the microphone.
    if (cancelled || userStopped) {
      release();
      end();
      return;
    }

    const types = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    const chosen = types.find((type) => MediaRecorder.isTypeSupported(type));

    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(media, chosen ? { mimeType: chosen, audioBitsPerSecond: 32_000 } : undefined);
    } catch {
      release();
      handlers.onError("failed");
      end();
      return;
    }

    recorder = rec;
    rec.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    rec.onerror = () => {
      cancelled = true;
      release();
      handlers.onError("failed");
      end();
    };
    rec.onstop = () => {
      void finish(rec.mimeType || chosen || "audio/webm");
    };

    startedAt = Date.now();
    rec.start(250);

    // Watch the microphone level: stop on its own after the person finishes speaking.
    try {
      const context = new AudioContext();
      audioContext = context;
      void context.resume();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(media).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      let lastSpeechAt = 0;

      poll = window.setInterval(() => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) {
          const value = (samples[i] - 128) / 128;
          sum += value * value;
        }
        const level = Math.sqrt(sum / samples.length);
        const now = Date.now();

        if (level > SPEECH_LEVEL) {
          heardSpeech = true;
          lastSpeechAt = now;
        }

        const quietFor = now - (heardSpeech ? lastSpeechAt : startedAt);
        const done =
          (heardSpeech && quietFor > SILENCE_AFTER_SPEECH_MS) || (!heardSpeech && quietFor > NO_SPEECH_TIMEOUT_MS) || now - startedAt > MAX_RECORDING_MS;

        if (done && rec.state !== "inactive") rec.stop();
      }, 100);
    } catch {
      // No level meter in this browser: record a fixed 8 seconds, or until stopped by hand.
      heardSpeech = true;
      window.setTimeout(() => {
        if (rec.state !== "inactive") rec.stop();
      }, 8000);
    }
  };

  void begin();

  return {
    stop: () => {
      userStopped = true;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    },
    abort: () => {
      cancelled = true;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    },
  };
}

/** Starts listening for one spoken phrase. Returns null when nothing can listen. */
export function startRecognizer(handlers: RecognizerHandlers): Listener | null {
  if (canUseBrowserSpeech()) {
    const listener = startBrowserSpeech(handlers);
    if (listener) return listener;
  }
  return startRecorder(handlers);
}

/**
 * Voice typing: the spoken words are sent to onText.
 * Listening stops by itself after a pause, and start() can be pressed again to add more.
 */
export function useDictation(onText: (text: string) => void, onError: (message: string) => void) {
  const mode = useVoiceMode();
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const listenerRef = useRef<Listener | null>(null);
  const textRef = useRef(onText);
  const errorRef = useRef(onError);

  useEffect(() => {
    textRef.current = onText;
    errorRef.current = onError;
  });

  useEffect(
    () => () => {
      listenerRef.current?.abort();
    },
    [],
  );

  const start = useCallback(() => {
    if (listenerRef.current) return;
    const listener = startRecognizer({
      onText: (text) => textRef.current(text),
      onError: (code) => {
        const message = recognitionErrorMessage(code);
        if (message) errorRef.current(message);
      },
      onProcessing: () => {
        setListening(false);
        setTranscribing(true);
      },
      onEnd: () => {
        listenerRef.current = null;
        setListening(false);
        setTranscribing(false);
      },
    });
    if (!listener) {
      errorRef.current("Voice typing couldn't start. Try again.");
      return;
    }
    listenerRef.current = listener;
    setListening(true);
  }, []);

  /** Ends listening and keeps the words. */
  const stop = useCallback(() => {
    listenerRef.current?.stop();
  }, []);

  /** Ends listening and throws the words away. */
  const cancel = useCallback(() => {
    listenerRef.current?.abort();
  }, []);

  return { supported: mode !== "none", mode, listening, transcribing, start, stop, cancel };
}

/* ---- Reading replies out loud ---- */

/** Splits a reply into short pieces, because Chrome cuts off long speech after about 15 seconds. */
function chunksOf(text: string): string[] {
  const pieces: string[] = [];
  for (const line of text.split(/\n+/)) {
    const clean = line
      .replace(/^\s*(?:[-•*]|\d+[.)])\s+/, "")
      .replace(/[*_`#>]+/g, "")
      .trim();
    if (!clean) continue;

    const sentences = clean.match(/[^.!?]+[.!?]*\s*/g) ?? [clean];
    let current = "";
    for (const sentence of sentences) {
      if (current && (current + sentence).length > 180) {
        pieces.push(current.trim());
        current = sentence;
      } else {
        current += sentence;
      }
    }
    if (current.trim()) pieces.push(current.trim());
  }
  return pieces;
}

/** Reads the text out loud. The promise settles when speaking ends or is stopped. */
export function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }
    const pieces = chunksOf(text);
    if (pieces.length === 0) {
      resolve();
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };

    pieces.forEach((piece, index) => {
      const utterance = new SpeechSynthesisUtterance(piece);
      utterance.lang = navigator.language || "en-US";
      if (index === pieces.length - 1) utterance.onend = finish;
      utterance.onerror = () => {
        if (finished) return;
        synth.cancel();
        finish();
      };
      synth.speak(utterance);
    });
  });
}

/** Stops any speech straight away. */
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

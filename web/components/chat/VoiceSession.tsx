"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, X } from "lucide-react";
import { recognitionErrorMessage, speak, startRecognizer, stopSpeaking, useVoiceMode, voiceNotice, type Listener } from "@/lib/voice";

type Phase = "listening" | "thinking" | "speaking" | "paused";

type Props = {
  /** Sends what the person said and resolves with the assistant's reply, or null when it failed. */
  onSend: (text: string) => Promise<string | null>;
  onClose: () => void;
};

/** After this many silent turns in a row the session pauses instead of listening forever. */
const MAX_SILENT_TURNS = 2;

const LABELS: Record<Phase, string> = {
  listening: "Listening",
  thinking: "Thinking",
  speaking: "Speaking. Tap to interrupt",
  paused: "Tap to talk",
};

export function VoiceSession({ onSend, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("listening");
  const [heard, setHeard] = useState("");
  const [note, setNote] = useState("");
  const mode = useVoiceMode();
  const sendRef = useRef(onSend);
  const resumeRef = useRef<() => void>(() => {});

  useEffect(() => {
    sendRef.current = onSend;
  });

  // One loop: listen, send, read the reply out loud, listen again.
  useEffect(() => {
    let active = true;
    let recognizer: Listener | null = null;
    let silentTurns = 0;

    function listen() {
      if (!active) return;
      setPhase("listening");
      setHeard("");
      setNote("");

      let got = "";
      let failed = false;

      const started = startRecognizer({
        onText: (text) => {
          got = text;
          setHeard(text);
          setNote("");
        },
        onProcessing: () => {
          setPhase("thinking");
          setNote("Turning your voice into text");
        },
        onError: (code) => {
          const message = recognitionErrorMessage(code);
          if (message) {
            failed = true;
            setNote(message);
          }
        },
        onEnd: () => {
          recognizer = null;
          if (!active) return;
          if (got) {
            silentTurns = 0;
            void respond(got);
            return;
          }
          if (failed) {
            setPhase("paused");
            return;
          }
          silentTurns += 1;
          if (silentTurns >= MAX_SILENT_TURNS) {
            setPhase("paused");
            setNote("I didn't hear anything. Tap the circle to talk again.");
            return;
          }
          listen();
        },
      });

      if (!started) {
        setPhase("paused");
        setNote("Voice couldn't start. Tap the circle to try again.");
        return;
      }
      recognizer = started;
    }

    async function respond(text: string) {
      setPhase("thinking");
      let reply: string | null = null;
      try {
        reply = await sendRef.current(text);
      } catch {
        reply = null;
      }
      if (!active) return;
      if (reply === null) {
        setPhase("paused");
        setNote("The assistant couldn't answer. Tap the circle to try again.");
        return;
      }
      setPhase("speaking");
      await speak(reply);
      listen();
    }

    resumeRef.current = () => {
      silentTurns = 0;
      listen();
    };

    const first = window.setTimeout(listen, 0);

    return () => {
      active = false;
      window.clearTimeout(first);
      recognizer?.abort();
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function tapOrb() {
    if (phase === "speaking") stopSpeaking();
    else if (phase === "paused") resumeRef.current();
  }

  const filled = phase === "listening" || phase === "speaking";

  return (
    <div role="dialog" aria-label="Live voice session" className="fade-in absolute inset-0 z-30 flex flex-col items-center justify-between bg-card px-6 py-5 text-center">
      <div className="flex w-full justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="End voice session"
          className="grid size-9 place-items-center rounded-xl border border-line bg-raised text-fg transition-colors duration-200 hover:border-accent-bright hover:text-accent-bright"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex w-full max-w-md flex-col items-center">
        <button
          type="button"
          onClick={tapOrb}
          disabled={phase === "listening" || phase === "thinking"}
          aria-label={LABELS[phase]}
          className={`relative grid size-36 place-items-center rounded-full border transition-colors duration-300 disabled:cursor-default ${
            filled ? "border-accent-bright bg-accent-bright text-canvas shadow-[0_0_3.5rem_-0.75rem_var(--glow)]" : "border-line bg-raised text-accent-bright"
          }`}
        >
          {phase === "listening" && (
            <>
              <span className="voice-ring" aria-hidden="true" />
              <span className="voice-ring" aria-hidden="true" />
            </>
          )}
          {phase === "thinking" && (
            <>
              <span className="absolute -inset-2 animate-spin rounded-full border border-dashed border-accent-bright [animation-duration:6s]" aria-hidden="true" />
              <span className="flex items-center gap-1.5" aria-hidden="true">
                <i className="typing-dot" />
                <i className="typing-dot" />
                <i className="typing-dot" />
              </span>
            </>
          )}
          {phase === "speaking" && (
            <span className="flex h-14 items-center gap-1.5" aria-hidden="true">
              <i className="voice-bar" />
              <i className="voice-bar" />
              <i className="voice-bar" />
              <i className="voice-bar" />
              <i className="voice-bar" />
            </span>
          )}
          {(phase === "listening" || phase === "paused") && <Mic className="relative size-11" aria-hidden="true" />}
        </button>

        <p role="status" aria-live="polite" className="mt-6 font-display text-lg font-semibold text-fg">
          {LABELS[phase]}
        </p>

        <p className="mt-3 min-h-12 text-sm leading-relaxed text-muted">{note ? note : heard ? `“${heard}”` : phase === "listening" ? "Say what you want to ask." : ""}</p>
      </div>

      <div className="flex w-full max-w-md flex-col items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-line bg-raised px-4 py-2 text-sm font-medium text-fg transition-colors duration-200 hover:border-accent-bright hover:text-accent-bright"
        >
          End session
        </button>
        <p className="text-xs leading-relaxed text-muted">
          {voiceNotice(mode)} The words are then sent to the assistant like a typed message, and the reply also appears in the chat.
        </p>
      </div>
    </div>
  );
}

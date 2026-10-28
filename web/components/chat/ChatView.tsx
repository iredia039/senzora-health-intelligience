"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Info, Send, Trash2 } from "lucide-react";
import { primaryButton, secondaryButton, textLink } from "@/components/ui/buttons";
import { askAssistant } from "@/lib/assistant";
import { useChat, useReadings } from "@/lib/hooks/useStoredData";
import { appendChatMessage, clearChat } from "@/lib/storage";
import type { ChatMessage } from "@/types";

const STARTERS = [
  "What does my latest blood pressure mean?",
  "How has my heart rate been lately?",
  "I have a headache and feel dizzy",
  "What can you help me with?",
];

const MAX_LENGTH = 500;
const STORAGE_ERROR = "Couldn't save this chat. Your browser is blocking storage for this site, so the conversation can't be kept on this device.";

export function ChatView() {
  const { ready, messages } = useChat();
  const { readings } = useReadings();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, sending]);

  if (!ready) {
    return (
      <div aria-busy="true" className="rounded-2xl border border-line bg-card px-6 py-16 text-center text-sm text-muted">
        Opening your conversation
      </div>
    );
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;

    const question: ChatMessage = { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() };
    if (!appendChatMessage(question)) {
      setError(STORAGE_ERROR);
      return;
    }
    setDraft("");
    setError("");
    setConfirmClear(false);
    setSending(true);
    try {
      const reply = await askAssistant([...messages, question], readings);
      if (!appendChatMessage(reply)) setError(STORAGE_ERROR);
    } catch {
      setError("The assistant couldn't answer. Send your message again.");
    } finally {
      setSending(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-[32rem] flex-col rounded-2xl border border-line bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <p className="flex items-center gap-2 text-sm text-muted">
          <Info className="size-4 shrink-0 text-accent-bright" aria-hidden="true" />
          Prototype assistant. Replies are written on this device from your saved readings. Nothing is sent anywhere.
        </p>
        {!empty &&
          (confirmClear ? (
            <div role="group" aria-label="Confirm starting a new chat" className="flex items-center gap-2">
              <span className="text-sm text-fg">Delete this conversation?</span>
              <button
                type="button"
                onClick={() => {
                  setConfirmClear(false);
                  if (!clearChat()) setError(STORAGE_ERROR);
                }}
                className={`${secondaryButton} px-3! py-1.5!`}
              >
                Delete chat
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className={`${secondaryButton} px-3! py-1.5!`}>
                Keep it
              </button>
            </div>
          ) : (
            <button type="button" disabled={sending} onClick={() => setConfirmClear(true)} className={`${secondaryButton} px-3! py-1.5!`}>
              <Trash2 className="size-3.5" aria-hidden="true" />
              New chat
            </button>
          ))}
      </div>

      <div ref={listRef} role="log" aria-label="Conversation" className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
        {empty && (
          <div className="mx-auto max-w-xl py-6 text-center">
            <h2 className="font-display text-lg font-semibold text-fg">Ask about your readings or how you feel</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {readings.length > 0
                ? "I can explain your saved heart rate and blood pressure, and talk through symptoms. I can't diagnose anything."
                : "You have no saved readings yet, so I can only talk through symptoms for now. Record a reading to get answers about your vitals."}
            </p>
            {readings.length === 0 && (
              <Link href="/vitals" className={`${textLink} mt-2`}>
                Go to Vitals
              </Link>
            )}
            <ul className="mt-5 flex flex-wrap justify-center gap-2">
              {STARTERS.map((starter) => (
                <li key={starter}>
                  <button
                    type="button"
                    onClick={() => send(starter)}
                    disabled={sending}
                    className="rounded-xl border border-line bg-canvas px-3.5 py-2 text-left text-sm text-fg transition-colors hover:border-muted hover:bg-raised disabled:opacity-50"
                  >
                    {starter}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-accent-bright px-4 py-2.5 text-sm leading-relaxed text-canvas sm:max-w-[75%]">
                <span className="sr-only">You said: </span>
                {m.content}
              </p>
            </div>
          ) : (
            <div key={m.id} className="flex justify-start">
              <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-raised px-4 py-3 sm:max-w-[80%]">
                <p className="text-xs font-medium text-muted">{m.prototype ? "Senzora prototype reply" : "Senzora"}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">{m.content}</p>
              </div>
            </div>
          ),
        )}

        {sending && (
          <div className="flex justify-start">
            <p role="status" className="rounded-2xl rounded-bl-md border border-dashed border-line px-4 py-2.5 text-sm text-muted">
              Senzora is reading your saved readings
            </p>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="border-t border-line p-3 sm:p-4"
      >
        {error && (
          <p role="alert" className="mb-2 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor="chat-input" className="sr-only">
              Your message
            </label>
            <textarea
              id="chat-input"
              rows={2}
              value={draft}
              maxLength={MAX_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              placeholder="Ask about your readings, or describe how you feel"
              className="w-full resize-none rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder:text-muted"
            />
          </div>
          <button type="submit" disabled={sending || draft.trim() === ""} className={`${primaryButton} h-11 shrink-0`}>
            <Send className="size-4" aria-hidden="true" />
            Send
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          General information, not a diagnosis. In an emergency, contact your local emergency service. Enter sends, Shift+Enter adds a new line.
        </p>
      </form>
    </div>
  );
}

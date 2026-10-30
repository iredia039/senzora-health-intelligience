"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Info, Send, Trash2 } from "lucide-react";
import { primaryButton, secondaryButton, textLink } from "@/components/ui/buttons";
import { ApiError } from "@/lib/api";
import { askAssistant } from "@/lib/assistant";
import { logout } from "@/lib/auth";
import { useChat, useReadings } from "@/lib/hooks/useStoredData";
import { getToken, loadUser } from "@/lib/session";
import { appendChatMessage, clearChat, hasAssistantConsent, saveAssistantConsent } from "@/lib/storage";
import type { ChatMessage } from "@/types";

const STARTERS = [
  "What does my latest blood pressure mean?",
  "How has my heart rate been lately?",
  "I have a headache and feel dizzy",
  "What can you help me with?",
];

const MAX_LENGTH = 500;
const STORAGE_ERROR = "Couldn't save this chat. Your browser is blocking storage for this site, so the conversation can't be kept on this device.";
const CONSENT_ERROR = "Couldn't save your choice. Your browser is blocking storage for this site, so your agreement can't be kept on this device.";

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Your login ended. Log in again to keep chatting.";
    if (error.status === 404) return "The server no longer has this conversation, so your next message starts a new one. Send it again.";
    if (error.status === 503) return "The assistant is unavailable right now. Try again in a moment.";
    return error.message;
  }
  return "The assistant couldn't answer. Try again.";
}

function SignInNotice({ pathname }: { pathname: string }) {
  const next = encodeURIComponent(pathname);
  return (
    <section aria-labelledby="signin-title" className="mx-auto max-w-2xl rounded-2xl border border-line bg-card px-5 py-6 sm:px-8 sm:py-8">
      <h2 id="signin-title" className="font-display text-xl font-semibold text-fg">
        Log in to use the assistant
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Your conversations are saved in your Senzora account, so the assistant needs to know who you are. Your vitals, Insights and History keep working without an account.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href={`/login?next=${next}`} className={primaryButton}>
          Log in
        </Link>
        <Link href={`/register?next=${next}`} className={secondaryButton}>
          Create account
        </Link>
      </div>
    </section>
  );
}

function ConsentNotice({ onAgree }: { onAgree: () => boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <section aria-labelledby="consent-title" className="mx-auto max-w-2xl rounded-2xl border border-line bg-card px-5 py-6 sm:px-8 sm:py-8">
      <h2 id="consent-title" className="font-display text-xl font-semibold text-fg">
        Before you use the assistant
      </h2>

      <div className="mt-5 space-y-5 text-sm leading-relaxed text-muted">
        <div>
          <h3 className="font-medium text-fg">What the assistant does</h3>
          <p className="mt-1">
            It answers general health questions in plain language. If you choose to include your readings, it uses them to explain what they may mean. It does not diagnose,
            prescribe, or replace a doctor. In an emergency, call your local emergency number or go to the nearest hospital.
          </p>
        </div>

        <div>
          <h3 className="font-medium text-fg">Where your messages go</h3>
          <p className="mt-1">
            Your messages, and your readings if you include them, are sent over the internet to an AI provider (OpenRouter and the AI model behind it). That provider may keep
            what it receives. Please do not write your name, phone number, address or other identifying details.
          </p>
        </div>

        <div>
          <h3 className="font-medium text-fg">What we store</h3>
          <p className="mt-1">Your conversations are saved in your Senzora account so you can see them again.</p>
        </div>
      </div>

      {failed && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {CONSENT_ERROR}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setFailed(!onAgree())} className={primaryButton}>
          I understand and agree
        </button>
        <Link href="/" className={secondaryButton}>
          Not now
        </Link>
      </div>
    </section>
  );
}

export function ChatView() {
  const pathname = usePathname();
  const { ready, messages } = useChat();
  const { readings } = useReadings();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [failedText, setFailedText] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [consent, setConsent] = useState<"checking" | "given" | "missing">("checking");
  const [session, setSession] = useState<"checking" | "in" | "out">("checking");
  const [userName, setUserName] = useState("");
  const [includeReadings, setIncludeReadings] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConsent(hasAssistantConsent() ? "given" : "missing");
    setSession(getToken() ? "in" : "out");
    setUserName(loadUser()?.name ?? "");
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, sending]);

  if (!ready || consent === "checking" || session === "checking") {
    return (
      <div aria-busy="true" className="rounded-2xl border border-line bg-card px-6 py-16 text-center text-sm text-muted">
        Opening your conversation
      </div>
    );
  }

  if (session === "out") return <SignInNotice pathname={pathname} />;

  if (consent === "missing") {
    return <ConsentNotice onAgree={() => (saveAssistantConsent() ? (setConsent("given"), true) : false)} />;
  }

  async function send(text: string, retry = false) {
    const content = text.trim();
    if (!content || sending) return;

    if (!retry) {
      const question: ChatMessage = { id: crypto.randomUUID(), role: "user", content, createdAt: new Date().toISOString() };
      if (!appendChatMessage(question)) {
        setError(STORAGE_ERROR);
        return;
      }
      setDraft("");
    }

    setError("");
    setFailedText(null);
    setConfirmClear(false);
    setSending(true);
    try {
      const reply = await askAssistant(content, includeReadings ? readings : []);
      if (!appendChatMessage(reply)) setError(STORAGE_ERROR);
    } catch (err) {
      setError(messageFor(err));
      // A 401 clears the saved login, so the page falls back to the log in notice.
      if (getToken() === null) setSession("out");
      else setFailedText(content);
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
          {userName ? `Logged in as ${userName}. ` : "Logged in. "}Replies come from an AI model and are general information.
        </p>
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            type="button"
            disabled={sending}
            onClick={() => {
              logout();
              setSession("out");
            }}
            className={`${secondaryButton} px-3! py-1.5!`}
          >
            Log out
          </button>
        </div>
      </div>

      <div ref={listRef} role="log" aria-label="Conversation" className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
        {empty && (
          <div className="mx-auto max-w-xl py-6 text-center">
            <h2 className="font-display text-lg font-semibold text-fg">Ask about your readings or how you feel</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {readings.length > 0
                ? "I can answer general health questions and talk through symptoms. Turn on the readings option below if you want me to explain your heart rate and blood pressure. I can't diagnose anything."
                : "You have no saved readings yet, so I can only answer general health questions and talk through symptoms for now. Record a reading to get answers about your vitals."}
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
              {includeReadings ? "Senzora is reading your saved readings" : "Senzora is writing a reply"}
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
          <div role="alert" className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-danger">
            <p>{error}</p>
            {failedText !== null && (
              <button type="button" onClick={() => send(failedText, true)} disabled={sending} className={textLink}>
                Try again
              </button>
            )}
          </div>
        )}

        <label className="mb-3 flex items-start gap-2.5 text-sm text-fg">
          <input
            type="checkbox"
            checked={includeReadings}
            disabled={readings.length === 0 || sending}
            onChange={(e) => setIncludeReadings(e.target.checked)}
            className="mt-0.5 size-4 accent-accent-bright disabled:opacity-50"
          />
          <span>
            Include my recent readings with my message
            <span className="block text-xs text-muted">
              {readings.length === 0
                ? "You have no saved readings yet."
                : "Off by default. Your readings are sent to the AI provider only while this is on."}
            </span>
          </span>
        </label>

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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Activity, ArrowUp, HeartPulse, History, LogOut, MessageCircleQuestion, Sparkles, SquarePen, Stethoscope, type LucideIcon } from "lucide-react";
import { SavedChats } from "@/components/chat/SavedChats";
import { primaryButton, secondaryButton, textLink } from "@/components/ui/buttons";
import { ApiError } from "@/lib/api";
import { askAssistant } from "@/lib/assistant";
import { logout } from "@/lib/auth";
import { loadConversation } from "@/lib/conversations";
import { useChat, useReadings } from "@/lib/hooks/useStoredData";
import { getToken, loadUser } from "@/lib/session";
import { appendChatMessage, clearChat, hasAssistantConsent, openSavedChat, saveAssistantConsent } from "@/lib/storage";
import type { ChatMessage } from "@/types";

const STARTERS: { text: string; icon: LucideIcon }[] = [
  { text: "What does my latest blood pressure mean?", icon: Activity },
  { text: "How has my heart rate been lately?", icon: HeartPulse },
  { text: "I have a headache and feel dizzy", icon: Stethoscope },
  { text: "What can you help me with?", icon: MessageCircleQuestion },
];

function timeOf(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

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

function SignInNotice({ pathname, notice }: { pathname: string; notice: string }) {
  const next = encodeURIComponent(pathname);
  return (
    <section aria-labelledby="signin-title" className="mx-auto max-w-2xl rounded-2xl border border-line bg-card px-5 py-6 sm:px-8 sm:py-8">
      <h2 id="signin-title" className="font-display text-xl font-semibold text-fg">
        Log in to use the assistant
      </h2>
      {notice && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {notice}
        </p>
      )}
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
  const [loginNotice, setLoginNotice] = useState("");
  const [showSaved, setShowSaved] = useState(false);
  const [opening, setOpening] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Defer browser-storage hydration so this effect only synchronizes with the client environment.
    const task = window.setTimeout(() => {
      setConsent(hasAssistantConsent() ? "given" : "missing");
      setSession(getToken() ? "in" : "out");
      setUserName(loadUser()?.name ?? "");
    }, 0);
    return () => window.clearTimeout(task);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  // The message box grows with what is typed, up to about six lines, then scrolls.
  useEffect(() => {
    const box = inputRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${Math.min(box.scrollHeight, 150)}px`;
  }, [draft, consent, session]);

  if (!ready || consent === "checking" || session === "checking") {
    return (
      <div aria-busy="true" className="rounded-2xl border border-line bg-card px-6 py-16 text-center text-sm text-muted">
        Opening your conversation
      </div>
    );
  }

  if (session === "out") return <SignInNotice pathname={pathname} notice={loginNotice} />;

  if (consent === "missing") {
    return <ConsentNotice onAgree={() => (saveAssistantConsent() ? (setConsent("given"), true) : false)} />;
  }

  function endLogin(notice: string) {
    setLoginNotice(notice);
    setSession("out");
  }

  async function send(text: string, retry = false) {
    const content = text.trim();
    if (!content || sending || opening) return;

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
      // A 401 clears the saved login, so the page falls back to the log in notice with the reason shown there.
      if (getToken() === null) {
        endLogin(messageFor(err));
      } else {
        setError(messageFor(err));
        setFailedText(content);
      }
    } finally {
      setSending(false);
    }
  }

  /** Loads one saved chat from the server and makes it the running chat. */
  async function openChat(id: number) {
    if (sending || opening) return;

    setError("");
    setFailedText(null);
    setConfirmClear(false);
    setOpening(true);
    try {
      const saved = await loadConversation(id);
      if (!openSavedChat(saved, id)) {
        setError(STORAGE_ERROR);
        return;
      }
      setShowSaved(false);
    } catch (err) {
      if (getToken() === null) {
        endLogin(messageFor(err));
      } else if (err instanceof ApiError && err.status === 404) {
        setError("That chat is no longer on the server. Pick another one.");
      } else {
        setError(messageFor(err));
      }
    } finally {
      setOpening(false);
    }
  }

  const empty = messages.length === 0;
  const nearLimit = draft.length >= MAX_LENGTH - 100;

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-[32rem] flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-[0_22px_54px_-42px_var(--accent)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-raised text-accent-bright">
            <Sparkles className="size-5" aria-hidden="true" />
            <span className="pulse-dot absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent-bright ring-2 ring-card" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold leading-tight text-fg">Senzora assistant</h2>
            <p className="truncate text-xs text-muted">{userName ? `Logged in as ${userName}` : "Logged in"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-expanded={showSaved}
            disabled={sending}
            onClick={() => setShowSaved((v) => !v)}
            className={`${secondaryButton} px-3! py-1.5!`}
          >
            <History className="size-3.5" aria-hidden="true" />
            Saved chats
          </button>
          {!empty &&
            (confirmClear ? (
              <div role="group" aria-label="Confirm starting a new chat" className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-fg">Start a new chat? This one stays in Saved chats.</span>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmClear(false);
                    if (!clearChat()) setError(STORAGE_ERROR);
                  }}
                  className={`${secondaryButton} px-3! py-1.5!`}
                >
                  Start new chat
                </button>
                <button type="button" onClick={() => setConfirmClear(false)} className={`${secondaryButton} px-3! py-1.5!`}>
                  Keep this chat
                </button>
              </div>
            ) : (
              <button type="button" disabled={sending} onClick={() => setConfirmClear(true)} className={`${secondaryButton} px-3! py-1.5!`}>
                <SquarePen className="size-3.5" aria-hidden="true" />
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
            <LogOut className="size-3.5" aria-hidden="true" />
            Log out
          </button>
        </div>
      </div>

      {showSaved && <SavedChats onOpen={openChat} onUnauthorized={() => endLogin("Your login ended. Log in again to keep chatting.")} disabled={sending || opening} />}

      <div ref={listRef} role="log" aria-label="Conversation" className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
        {empty && (
          <div className="mx-auto flex max-w-xl flex-col items-center py-4 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border border-line bg-raised text-accent-bright shadow-[0_0_2.5rem_-1rem_var(--accent)]">
              <Sparkles className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-display text-xl font-semibold text-fg">Ask about your readings or how you feel</h2>
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
            <ul className="mt-6 grid w-full gap-2.5 sm:grid-cols-2">
              {STARTERS.map(({ text, icon: Icon }) => (
                <li key={text}>
                  <button
                    type="button"
                    onClick={() => send(text)}
                    disabled={sending || opening}
                    className="group flex h-full w-full items-start gap-3 rounded-2xl border border-line bg-canvas px-4 py-3 text-left text-sm text-fg transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-bright hover:bg-raised disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-accent-bright" aria-hidden="true" />
                    <span>{text}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex flex-col items-end gap-1">
              <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-accent-bright px-4 py-2.5 text-sm leading-relaxed text-canvas shadow-[0_10px_24px_-16px_var(--glow)] sm:max-w-[72%]">
                <span className="sr-only">You said: </span>
                {m.content}
              </p>
              <span className="px-1 text-[11px] text-muted">{timeOf(m.createdAt)}</span>
            </div>
          ) : (
            <div key={m.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-raised text-accent-bright">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 max-w-[90%] sm:max-w-[78%]">
                <div className="rounded-2xl rounded-tl-md border border-line bg-raised px-4 py-3">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
                    <span className="sr-only">{m.prototype ? "Senzora prototype reply: " : "Senzora said: "}</span>
                    {m.content}
                  </p>
                </div>
                <span className="mt-1 block px-1 text-[11px] text-muted">
                  {m.prototype ? "Prototype reply" : "Senzora"}
                  {timeOf(m.createdAt) ? `, ${timeOf(m.createdAt)}` : ""}
                </span>
              </div>
            </div>
          ),
        )}

        {sending && (
          <div role="status" className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-raised text-accent-bright">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div className="rounded-2xl rounded-tl-md border border-line bg-raised px-4 py-3">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                <i className="typing-dot" />
                <i className="typing-dot" />
                <i className="typing-dot" />
              </div>
              <span className="sr-only">{includeReadings ? "Senzora is reading your saved readings" : "Senzora is writing a reply"}</span>
            </div>
            <p className="self-center text-xs text-muted">{includeReadings ? "Reading your saved readings" : "Writing a reply"}</p>
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
          <div role="alert" className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-danger px-3.5 py-2.5 text-sm text-danger">
            <p>{error}</p>
            {failedText !== null && (
              <button type="button" onClick={() => send(failedText, true)} disabled={sending} className={textLink}>
                Try again
              </button>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-line bg-canvas transition-[border-color,box-shadow] duration-200 focus-within:border-accent-bright focus-within:shadow-[0_0_0_3px_var(--glow)]">
          <label htmlFor="chat-input" className="sr-only">
            Your message
          </label>
          <textarea
            id="chat-input"
            ref={inputRef}
            rows={1}
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
            className="block w-full resize-none border-0! bg-transparent px-4 pb-1 pt-3.5 text-sm leading-relaxed text-fg shadow-none! outline-none! placeholder:text-muted"
          />
          <div className="flex items-center justify-between gap-3 px-3 pb-2.5 pt-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                role="switch"
                aria-checked={includeReadings}
                aria-labelledby="readings-label"
                aria-describedby="readings-hint"
                disabled={readings.length === 0 || sending}
                onClick={() => setIncludeReadings((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                  includeReadings ? "border-accent-bright bg-accent-bright" : "border-line bg-raised"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0.5 top-0.5 size-[18px] rounded-full transition-transform duration-200 ${
                    includeReadings ? "translate-x-5 bg-canvas" : "translate-x-0 bg-muted"
                  }`}
                />
              </button>
              <span id="readings-label" className="truncate text-sm text-fg">
                Include my readings
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {nearLimit && (
                <span className={`text-xs tabular-nums ${draft.length >= MAX_LENGTH ? "text-danger" : "text-muted"}`} aria-live="polite">
                  {draft.length}/{MAX_LENGTH}
                </span>
              )}
              <button
                type="submit"
                disabled={sending || opening || draft.trim() === ""}
                aria-label="Send message"
                className="grid size-9 place-items-center rounded-xl bg-accent-bright text-canvas shadow-[0_8px_20px_-10px_var(--glow)] transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              >
                <ArrowUp className="size-[18px]" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <p id="readings-hint" className="mt-2.5 text-xs leading-relaxed text-muted">
          {readings.length === 0
            ? "You have no saved readings yet. "
            : "Readings are off by default and reach the AI provider only while this is on. "}
          General information, not a diagnosis. In an emergency, contact your local emergency service. Enter sends, Shift+Enter adds a new line.
        </p>
      </form>
    </div>
  );
}

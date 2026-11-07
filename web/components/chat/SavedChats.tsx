"use client";

import { useEffect, useState } from "react";
import { MessageSquare, SquarePen, X } from "lucide-react";
import { primaryButton, textLink } from "@/components/ui/buttons";
import { ApiError } from "@/lib/api";
import { listConversations, type ConversationSummary } from "@/lib/conversations";
import { loadConversationId } from "@/lib/storage";

function timeOf(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayOf(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString([], { day: "numeric", month: "short" });
}

const GROUPS = ["Today", "Yesterday", "Previous 7 days", "Earlier"] as const;
type Group = (typeof GROUPS)[number];

function groupOf(iso: string): Group {
  const date = new Date(iso).getTime();
  if (Number.isNaN(date)) return "Earlier";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const day = 86_400_000;
  if (date >= startOfToday.getTime()) return "Today";
  if (date >= startOfToday.getTime() - day) return "Yesterday";
  if (date >= startOfToday.getTime() - 6 * day) return "Previous 7 days";
  return "Earlier";
}

type Props = {
  /** Called with the id of the chat the person picked. */
  onOpen: (id: number) => void;
  /** Starts a fresh chat. */
  onNewChat: () => void;
  onClose: () => void;
  /** Called when the server says the login is no longer good. */
  onUnauthorized: () => void;
  /** True while a message is sending or another chat is opening. */
  disabled: boolean;
};

export function SavedChats({ onOpen, onNewChat, onClose, onUnauthorized, disabled }: Props) {
  const [chats, setChats] = useState<ConversationSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const currentId = loadConversationId();

  useEffect(() => {
    let cancelled = false;
    listConversations()
      .then((data) => {
        if (cancelled) return;
        setChats(data);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setMessage(err instanceof ApiError ? err.message : "Couldn't load your saved chats.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // The list loads once each time the panel opens, and again when Try again is pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sections = GROUPS.map((name) => ({ name, items: chats.filter((c) => groupOf(c.createdAt) === name) })).filter((s) => s.items.length > 0);

  return (
    <aside aria-label="Saved chats" className="drawer-in relative z-10 flex h-full w-80 max-w-[88%] flex-col border-r border-line bg-card shadow-[24px_0_48px_-32px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
        <h2 className="font-display text-base font-semibold text-fg">Saved chats</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close saved chats"
          className="grid size-8 place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-raised hover:text-fg"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="px-4 pb-3">
        <button type="button" onClick={onNewChat} disabled={disabled} className={`${primaryButton} w-full justify-center`}>
          <SquarePen className="size-4" aria-hidden="true" />
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-line px-3 py-3">
        {status === "loading" && (
          <div role="status" aria-label="Loading your saved chats" className="space-y-2">
            {[0, 1, 2, 3, 4].map((n) => (
              <div key={n} className="animate-pulse rounded-xl border border-line bg-canvas px-3 py-3">
                <div className="h-3 w-3/4 rounded bg-raised" />
                <div className="mt-2 h-2.5 w-1/3 rounded bg-raised" />
              </div>
            ))}
          </div>
        )}

        {status === "error" && (
          <div role="alert" className="rounded-xl border border-danger px-3.5 py-3 text-sm text-danger">
            <p>{message}</p>
            <button
              type="button"
              onClick={() => {
                setStatus("loading");
                setReloadKey((k) => k + 1);
              }}
              className={`${textLink} mt-1`}
            >
              Try again
            </button>
          </div>
        )}

        {status === "ready" && chats.length === 0 && (
          <div className="flex flex-col items-center px-3 py-10 text-center">
            <span className="grid size-11 place-items-center rounded-xl border border-line bg-raised text-accent-bright">
              <MessageSquare className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium text-fg">No saved chats yet</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">Send a message and the chat appears here with a short title.</p>
          </div>
        )}

        {status === "ready" &&
          sections.map((section) => (
            <section key={section.name} className="mb-4 last:mb-0">
              <h3 className="px-1.5 pb-1.5 text-xs font-medium text-muted">{section.name}</h3>
              <ul className="space-y-1.5">
                {section.items.map((chat) => {
                  const active = chat.id === currentId;
                  return (
                    <li key={chat.id}>
                      <button
                        type="button"
                        onClick={() => onOpen(chat.id)}
                        disabled={disabled}
                        aria-current={active ? "true" : undefined}
                        className={`group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 ${
                          active ? "border-accent-bright bg-raised" : "border-transparent hover:border-line hover:bg-raised"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border transition-colors duration-200 ${
                            active ? "border-accent-bright text-accent-bright" : "border-line text-muted group-hover:text-accent-bright"
                          }`}
                        >
                          <MessageSquare className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-fg">{chat.title || "Untitled chat"}</span>
                          <span className="block text-xs text-muted">
                            {section.name === "Today" ? timeOf(chat.createdAt) : `${dayOf(chat.createdAt)}, ${timeOf(chat.createdAt)}`}
                            {active ? " · open now" : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
      </div>
    </aside>
  );
}

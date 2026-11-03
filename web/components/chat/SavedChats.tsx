"use client";

import { useEffect, useState } from "react";
import { textLink } from "@/components/ui/buttons";
import { ApiError } from "@/lib/api";
import { listConversations, type ConversationSummary } from "@/lib/conversations";
import { loadConversationId } from "@/lib/storage";

function whenOf(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString([], { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}`;
}

type Props = {
  /** Called with the id of the chat the person picked. */
  onOpen: (id: number) => void;
  /** Called when the server says the login is no longer good. */
  onUnauthorized: () => void;
  /** True while a message is sending or another chat is opening. */
  disabled: boolean;
};

export function SavedChats({ onOpen, onUnauthorized, disabled }: Props) {
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

  return (
    <section aria-label="Saved chats" className="max-h-56 overflow-y-auto border-b border-line bg-canvas px-4 py-3 sm:px-5">
      {status === "loading" && (
        <p role="status" className="text-sm text-muted">
          Loading your saved chats
        </p>
      )}

      {status === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-danger">
          <p>{message}</p>
          <button
            type="button"
            onClick={() => {
              setStatus("loading");
              setReloadKey((k) => k + 1);
            }}
            className={textLink}
          >
            Try again
          </button>
        </div>
      )}

      {status === "ready" && chats.length === 0 && <p className="text-sm text-muted">No saved chats yet. Send a message and the chat will appear here.</p>}

      {status === "ready" && chats.length > 0 && (
        <ul className="space-y-2">
          {chats.map((chat) => {
            const active = chat.id === currentId;
            return (
              <li key={chat.id}>
                <button
                  type="button"
                  onClick={() => onOpen(chat.id)}
                  disabled={disabled}
                  aria-current={active ? "true" : undefined}
                  className={`flex w-full flex-col rounded-xl border px-3.5 py-2.5 text-left transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 ${
                    active ? "border-accent-bright bg-raised" : "border-line bg-card hover:border-accent-bright hover:bg-raised"
                  }`}
                >
                  <span className="block truncate text-sm font-medium text-fg">{chat.title || "Untitled chat"}</span>
                  <span className="block text-xs text-muted">
                    {whenOf(chat.createdAt)}
                    {active ? ", open now" : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

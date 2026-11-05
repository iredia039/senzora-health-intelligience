"use client";

import { useState, type FormEvent } from "react";
import { updateName } from "@/lib/auth";
import type { SessionUser } from "@/lib/session";
import { card, input, label, Message, primaryButton, toMessage, type Notice } from "./ui";

type Props = { user: SessionUser; emailText: string };

export default function PersonalSection({ user, emailText }: Props) {
  const [name, setName] = useState(user.name);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 50) {
      setNotice({ kind: "error", text: "Name must be 1 to 50 characters." });
      return;
    }
    if (trimmed === user.name) {
      setNotice({ kind: "error", text: "That is already your name." });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const profile = await updateName(trimmed);
      setName(profile.name);
      setNotice({ kind: "ok", text: "Name updated." });
    } catch (err) {
      setNotice({ kind: "error", text: toMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="personal-title" className={card}>
      <h2 id="personal-title" className="text-lg font-semibold text-fg">
        Personal information
      </h2>
      <form onSubmit={save} className="mt-4 space-y-4">
        <div>
          <label htmlFor="profile-name" className={label}>
            Full name
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            maxLength={50}
            autoComplete="name"
            onChange={(e) => setName(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="profile-email" className={label}>
            Email address
          </label>
          <input id="profile-email" type="email" value={emailText} disabled readOnly className={input} />
          <p className="mt-1.5 text-xs text-fg/70">Changing your email is not available yet.</p>
        </div>
        <Message notice={notice} />
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setName(user.name);
              setNotice(null);
            }}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-fg outline-none hover:bg-canvas focus-visible:ring-2 focus-visible:ring-[#5CE1E6]/60 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { changePassword } from "@/lib/auth";
import { card, input, label, Message, primaryButton, secondaryButton, toMessage, type Notice } from "./ui";
import LogoutButton from "@/components/auth/LogoutButton";

export default function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!current || !next || !confirm) {
      setNotice({ kind: "error", text: "Fill in every field." });
      return;
    }
    if (next.length < 8) {
      setNotice({ kind: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (next === current) {
      setNotice({ kind: "error", text: "New password must be different." });
      return;
    }
    if (next !== confirm) {
      setNotice({ kind: "error", text: "The new passwords do not match." });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setNotice({ kind: "ok", text: "Password changed." });
    } catch (err) {
      setNotice({ kind: "error", text: toMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section aria-labelledby="password-title" className={card}>
        <h2 id="password-title" className="text-lg font-semibold text-fg">
          Change password
        </h2>
        <form onSubmit={save} className="mt-4 space-y-4">
          <div>
            <label htmlFor="current-password" className={label}>
              Current password
            </label>
            <input id="current-password" type="password" value={current} autoComplete="current-password" onChange={(e) => setCurrent(e.target.value)} className={input} />
          </div>
          <div>
            <label htmlFor="new-password" className={label}>
              New password
            </label>
            <input id="new-password" type="password" value={next} autoComplete="new-password" onChange={(e) => setNext(e.target.value)} className={input} />
            <p className="mt-1.5 text-xs text-fg/70">At least 8 characters.</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className={label}>
              Confirm new password
            </label>
            <input id="confirm-password" type="password" value={confirm} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} className={input} />
          </div>
          <Message notice={notice} />
          <button type="submit" disabled={busy} className={primaryButton}>
            {busy ? "Changing…" : "Change password"}
          </button>
        </form>
      </section>

      <section aria-labelledby="privacy-title" className={card}>
        <h2 id="privacy-title" className="text-lg font-semibold text-fg">
          Privacy and data
        </h2>
        <p className="mt-1 text-sm text-fg/70">
          Senzora does not sell your information. Messages you send to the assistant go to an AI provider (OpenRouter) that may keep them. Voice recordings may go to a speech-to-text service (Groq). Consent, data export and deleting the
          data saved on this device are in Settings.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/settings" className={secondaryButton}>
            Open Settings
          </Link>
          <LogoutButton className={secondaryButton}>Sign out</LogoutButton>
        </div>
      </section>

      <section aria-labelledby="soon-title" className={card}>
        <h2 id="soon-title" className="text-lg font-semibold text-fg">
          Not available yet
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-fg/70">
          <li>Change email address</li>
          <li>Active sessions and devices</li>
          <li>Account deletion</li>
        </ul>
      </section>
    </>
  );
}

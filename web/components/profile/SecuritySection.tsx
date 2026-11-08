"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { confirmPasswordChange, requestPasswordChange } from "@/lib/auth";
import { card, input, label, Message, primaryButton, secondaryButton, toMessage, type Notice } from "./ui";
import LogoutButton from "@/components/auth/LogoutButton";

const RESEND_SECONDS = 60;

/** Same rule as the server, so people see the problem before waiting on the network. */
function passwordProblem(password: string): string | null {
  if (password.length < 8) return "New password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "New password must contain at least one capital letter.";
  if (!/[0-9]/.test(password)) return "New password must contain at least one number.";
  return null;
}

export default function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  // Counts the resend wait down one second at a time.
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function sendCode(resend: boolean) {
    setBusy(true);
    setNotice(null);
    try {
      await requestPasswordChange(current, next);
      setStep("code");
      setCode("");
      setWait(RESEND_SECONDS);
      setNotice({ kind: "ok", text: resend ? "A new code was sent to your email." : "We sent a 6-digit code to your email." });
    } catch (err) {
      setNotice({ kind: "error", text: toMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  function submitForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!current || !next || !confirm) {
      setNotice({ kind: "error", text: "Fill in every field." });
      return;
    }
    const problem = passwordProblem(next);
    if (problem) {
      setNotice({ kind: "error", text: problem });
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
    void sendCode(false);
  }

  async function submitCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!/^[0-9]{6}$/.test(code)) {
      setNotice({ kind: "error", text: "Enter the 6-digit code from your email." });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      await confirmPasswordChange(code);
      setCurrent("");
      setNext("");
      setConfirm("");
      setCode("");
      setStep("form");
      setWait(0);
      setNotice({ kind: "ok", text: "Password changed." });
    } catch (err) {
      setNotice({ kind: "error", text: toMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setStep("form");
    setCode("");
    setNotice(null);
  }

  return (
    <>
      <section aria-labelledby="password-title" className={card}>
        <h2 id="password-title" className="text-lg font-semibold text-fg">
          Change password
        </h2>

        {step === "form" ? (
          <form onSubmit={submitForm} className="mt-4 space-y-4">
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
              <p className="mt-1.5 text-xs text-fg/70">At least 8 characters, with one capital letter and one number.</p>
            </div>
            <div>
              <label htmlFor="confirm-password" className={label}>
                Confirm new password
              </label>
              <input id="confirm-password" type="password" value={confirm} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} className={input} />
            </div>
            <Message notice={notice} />
            <button type="submit" disabled={busy} className={primaryButton}>
              {busy ? "Sending code…" : "Send verification code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitCode} className="mt-4 space-y-4">
            <p className="text-sm text-fg/70">Enter the 6-digit code we sent to your email to confirm the new password. It expires in 10 minutes.</p>
            <div>
              <label htmlFor="password-code" className={label}>
                Verification code
              </label>
              <input
                id="password-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
                className={`${input} tracking-[0.5em]`}
              />
            </div>
            <Message notice={notice} />
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={busy} className={primaryButton}>
                {busy ? "Checking…" : "Confirm password change"}
              </button>
              <button type="button" disabled={busy || wait > 0} onClick={() => void sendCode(true)} className={secondaryButton}>
                {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
              </button>
              <button type="button" disabled={busy} onClick={startOver} className={secondaryButton}>
                Back
              </button>
            </div>
          </form>
        )}
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
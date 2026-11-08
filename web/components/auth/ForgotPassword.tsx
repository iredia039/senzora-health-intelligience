"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/brand/Logo";
import { primaryButton, textLink } from "@/components/ui/buttons";
import { ApiError } from "@/lib/api";
import { requestPasswordReset, resetPassword } from "@/lib/auth";
import { passwordProblem } from "@/lib/password";
import { Field } from "./AuthForm";

type Step = "email" | "reset" | "done";

const RESEND_SECONDS = 60;

const inputClass = "w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder:text-muted";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const toMessage = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong. Try again.");

  // Counts the resend wait down one second at a time.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function sendCode(resend: boolean) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestPasswordReset(email.trim());
      setStep("reset");
      setCode("");
      setCooldown(RESEND_SECONDS);
      setNotice(resend ? "If an account exists for that email, a new code was sent." : "If an account exists for that email, we sent a 6-digit code.");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function submitEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    void sendCode(false);
  }

  async function submitReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!/^[0-9]{6}$/.test(code)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    const problem = passwordProblem(next);
    if (problem) {
      setError(problem);
      return;
    }
    if (next !== confirm) {
      setError("The new passwords do not match.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await resetPassword(email.trim(), code, next);
      setStep("done");
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function changeEmail() {
    setStep("email");
    setCode("");
    setNext("");
    setConfirm("");
    setCooldown(0);
    setError("");
    setNotice("");
  }

  return (
    <main className="medical-grid relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,var(--glow),transparent_28rem)]" />
      <section aria-labelledby="forgot-title" className="relative w-full max-w-md rounded-3xl border border-line bg-card/95 px-5 py-7 shadow-2xl backdrop-blur sm:px-8 sm:py-9">
        <Logo size="sm" showTagline />
        <h1 id="forgot-title" className="mt-3 font-display text-2xl font-semibold text-fg">
          {step === "done" ? "Password changed" : "Forgot password"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {step === "email" && "Enter the email you signed up with and we will send you a 6-digit code."}
          {step === "reset" && `Enter the code we sent to ${email.trim()} and choose a new password. The code expires in 10 minutes.`}
          {step === "done" && "You can log in with your new password now."}
        </p>

        {step === "email" && (
          <>
            <form onSubmit={submitEmail} noValidate className="mt-6 space-y-4">
              <Field id="forgot-email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />

              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
                {busy ? "Please wait" : "Send code"}
              </button>
            </form>

            <p className="mt-5 text-sm text-muted">
              <Link href="/login" className={textLink}>
                Back to log in
              </Link>
            </p>
          </>
        )}

        {step === "reset" && (
          <>
            <form onSubmit={submitReset} noValidate className="mt-6 space-y-4">
              <div>
                <label htmlFor="reset-code" className="text-sm font-medium text-fg">
                  Verification code
                </label>
                <input
                  id="reset-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={`${inputClass} mt-1.5 text-center text-lg tracking-[0.5em]`}
                />
              </div>
              <Field id="reset-new" label="New password" type="password" value={next} onChange={setNext} autoComplete="new-password" />
              <p className="-mt-2 text-xs text-muted">At least 8 characters, with one capital letter and one number.</p>
              <Field id="reset-confirm" label="Confirm new password" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

              {notice && (
                <p role="status" className="text-sm text-muted">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
                {busy ? "Please wait" : "Reset password"}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
              <button type="button" onClick={() => void sendCode(true)} disabled={busy || cooldown > 0} className={`${textLink} disabled:opacity-50`}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
              <button type="button" onClick={changeEmail} className={textLink}>
                Use a different email
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <Link href="/login" className={`${primaryButton} mt-6 w-full`}>
            Go to log in
          </Link>
        )}
      </section>
    </main>
  );
}
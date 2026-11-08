"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { primaryButton, textLink } from "@/components/ui/buttons";
import { ApiError } from "@/lib/api";
import { login, register, resendCode, verifyEmail } from "@/lib/auth";

type Mode = "login" | "register";
type Step = "form" | "verify";

const RESEND_SECONDS = 60;

const inputClass = "w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder:text-muted";

/** Only same-site paths are allowed, so a crafted link cannot send someone to another site. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export function Field(props: { id: string; label: string; type: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [shown, setShown] = useState(false);
  const isPassword = props.type === "password";

  return (
    <div>
      <label htmlFor={props.id} className="text-sm font-medium text-fg">
        {props.label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={props.id}
          type={isPassword && shown ? "text" : props.type}
          value={props.value}
          autoComplete={props.autoComplete}
          onChange={(e) => props.onChange(e.target.value)}
          className={`${inputClass}${isPassword ? " pr-11" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((v) => !v)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted transition-colors hover:text-fg"
          >
            {shown ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";
  const isVerify = step === "verify";

  const toMessage = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong. Try again.");

  // Counts the resend wait down one second at a time.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function openVerifyStep(message: string) {
    setCode("");
    setStep("verify");
    setCooldown(RESEND_SECONDS);
    setNotice(message);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if ((isRegister && !name.trim()) || !email.trim() || !password) {
      setError("Fill in every field.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    if (isRegister) {
      try {
        await register(name.trim(), email.trim(), password);
        openVerifyStep("We sent a 6-digit code to your email.");
      } catch (err) {
        setError(toMessage(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    try {
      await login(email.trim(), password);
      router.push(next);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        // The password was right but the email is not verified yet, so send a fresh code.
        try {
          await resendCode(email.trim());
        } catch (resendErr) {
          // 429 means a code was sent less than a minute ago, which is fine.
          if (!(resendErr instanceof ApiError && resendErr.status === 429)) {
            setError(toMessage(resendErr));
            return;
          }
        }
        openVerifyStep("Your email is not verified yet. Enter the code we sent you.");
      } else {
        setError(toMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (code.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await verifyEmail(email.trim(), code);
    } catch (err) {
      setError(toMessage(err));
      setBusy(false);
      return;
    }

    try {
      await login(email.trim(), password);
      router.push(next);
    } catch {
      // The email is verified now, so a failed automatic login sends them to the log in page.
      router.push(`/login?next=${encodeURIComponent(next)}`);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (busy || cooldown > 0) return;
    setError("");
    setNotice("");

    try {
      await resendCode(email.trim());
      setCooldown(RESEND_SECONDS);
      setNotice("A new code is on its way.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setCooldown(Number(err.message.match(/\d+/)?.[0] ?? RESEND_SECONDS));
      } else {
        setError(toMessage(err));
      }
    }
  }

  function changeEmail() {
    setStep("form");
    setCode("");
    setError("");
    setNotice("");
  }

  const otherHref = `/${isRegister ? "login" : "register"}?next=${encodeURIComponent(next)}`;

  return (
    <main className="medical-grid relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,var(--glow),transparent_28rem)]" />
      <section aria-labelledby="auth-title" className="relative w-full max-w-md rounded-3xl border border-line bg-card/95 px-5 py-7 shadow-2xl backdrop-blur sm:px-8 sm:py-9">
        <Logo size="sm" showTagline />
        <h1 id="auth-title" className="mt-3 font-display text-2xl font-semibold text-fg">
          {isVerify ? "Check your email" : isRegister ? "Create your account" : "Log in"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {isVerify
            ? `Enter the 6-digit code we sent to ${email.trim()}. It expires in 10 minutes.`
            : isRegister
              ? "An account keeps your assistant conversations saved."
              : "Log in to use the assistant and see your saved conversations."}
        </p>

        {isVerify ? (
          <>
            <form onSubmit={submitCode} noValidate className="mt-6 space-y-4">
              <div>
                <label htmlFor="code" className="text-sm font-medium text-fg">
                  Verification code
                </label>
                <input
                  id="code"
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
                {busy ? "Please wait" : "Verify and continue"}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-sm">
              <button type="button" onClick={resend} disabled={busy || cooldown > 0} className={`${textLink} disabled:opacity-50`}>
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
              <button type="button" onClick={changeEmail} className={textLink}>
                Use a different email
              </button>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
              {isRegister && <Field id="name" label="Name" type="text" value={name} onChange={setName} autoComplete="name" />}
              <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete={isRegister ? "new-password" : "current-password"} />

              {!isRegister && (
                <div className="-mt-1 text-right text-sm">
                  <Link href="/forgot-password" className={textLink}>
                    Forgot password?
                  </Link>
                </div>
              )}

              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}

              <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
                {busy ? "Please wait" : isRegister ? "Create account" : "Log in"}
              </button>
            </form>

            <p className="mt-5 text-sm text-muted">
              {isRegister ? "Already have an account? " : "No account yet? "}
              <Link href={otherHref} className={textLink}>
                {isRegister ? "Log in" : "Create one"}
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
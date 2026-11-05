"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { primaryButton, textLink } from "@/components/ui/buttons";
import { ApiError } from "@/lib/api";
import { login, register } from "@/lib/auth";

type Mode = "login" | "register";

const inputClass = "w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder:text-muted";

/** Only same-site paths are allowed, so a crafted link cannot send someone to another site. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function Field(props: { id: string; label: string; type: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  const toMessage = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong. Try again.");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if ((isRegister && !name.trim()) || !email.trim() || !password) {
      setError("Fill in every field.");
      return;
    }

    setBusy(true);
    setError("");

    if (isRegister) {
      try {
        await register(name.trim(), email.trim(), password);
      } catch (err) {
        setError(toMessage(err));
        setBusy(false);
        return;
      }
    }

    try {
      await login(email.trim(), password);
     router.push("/dashboard");
    } catch (err) {
      // The account exists now, so a failed automatic login sends them to the log in page.
      if (isRegister) router.push(`/login?next=${encodeURIComponent(next)}`);
      else setError(toMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const otherHref = `/${isRegister ? "login" : "register"}?next=${encodeURIComponent(next)}`;

  return (
    <main className="medical-grid relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,var(--glow),transparent_28rem)]" />
      <section aria-labelledby="auth-title" className="relative w-full max-w-md rounded-3xl border border-line bg-card/95 px-5 py-7 shadow-2xl backdrop-blur sm:px-8 sm:py-9">
        <Logo size="sm" showTagline />
        <h1 id="auth-title" className="mt-3 font-display text-2xl font-semibold text-fg">
          {isRegister ? "Create your account" : "Log in"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {isRegister ? "An account keeps your assistant conversations saved." : "Log in to use the assistant and see your saved conversations."}
        </p>

        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          {isRegister && <Field id="name" label="Name" type="text" value={name} onChange={setName} autoComplete="name" />}
          <Field id="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
          <Field id="password" label="Password" type="password" value={password} onChange={setPassword} autoComplete={isRegister ? "new-password" : "current-password"} />

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
        <p className="mt-2 text-sm text-muted">
          Vitals, Insights and History work without an account.{" "}
          <Link href="/dashboard" className={textLink}>
            Back to the app
          </Link>
        </p>
      </section>
    </main>
  );
}

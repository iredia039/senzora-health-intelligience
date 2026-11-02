"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, User, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { NAV_ITEMS } from "./nav";
import { countRecentFlags } from "@/lib/analysis";
import { useHydrated, usePreferences, useReadings } from "@/lib/hooks/useStoredData";
import { useSessionUser } from "@/lib/hooks/useSession";
import { ThemeToggle } from "./ThemeToggle";

function NavLinks({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className={compact ? "flex min-w-0 items-center gap-1" : "flex flex-col gap-1"}>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        const layout = compact
          ? "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold"
          : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium";
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`${layout} transition-colors ${
              active
                ? "bg-accent/10 text-accent-bright shadow-[0_0_20px_-8px_var(--glow)]"
                : "text-muted hover:bg-raised hover:text-fg"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileCard({ onNavigate }: { onNavigate?: () => void }) {
  const hydrated = useHydrated();
  const user = useSessionUser();
  const pathname = usePathname();

  // Nothing is shown until the browser has checked for a login, so a name never flashes in or out.
  if (!hydrated) return <div aria-hidden="true" className="h-[3.625rem] rounded-xl border border-line bg-card" />;

  const box = "flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 transition-colors hover:bg-raised";
  const avatar = "grid size-9 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent-bright";

  if (!user) {
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} onClick={onNavigate} className={box}>
        <span className={avatar} aria-hidden="true">
          <User className="size-4" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-medium text-fg">Log in</span>
          <span className="block text-xs text-muted">to use the assistant</span>
        </span>
      </Link>
    );
  }

  return (
    <Link href="/settings" onClick={onNavigate} className={box}>
      <span className={avatar} aria-hidden="true">
        {user.name.trim().charAt(0).toUpperCase() || "S"}
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-medium text-fg">{user.name}</span>
        <span className="block text-xs text-muted">Logged in</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = NAV_ITEMS.find((item) => item.href === pathname);
  const hydrated = useHydrated();
  const { readings } = useReadings();
  const { alertsEnabled } = usePreferences();
  // The current time is only read in the browser, never while the page is prerendered.
  const recentFlags = useMemo(() => (hydrated && alertsEnabled ? countRecentFlags(readings) : 0), [hydrated, alertsEnabled, readings]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="senzora-app min-h-screen xl:pt-20">
      {/* Desktop sidebar */}
      <aside className="telemetry-topnav fixed inset-x-0 top-0 z-30 hidden h-20 items-center gap-6 border-b border-line bg-surface/95 px-6 backdrop-blur-xl xl:flex">
        <Logo />
        <NavLinks compact />
        <div className="ml-auto"><ProfileCard /></div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 xl:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60" />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col justify-between border-r border-line bg-surface p-4 shadow-2xl">
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2 pt-2">
                <Logo />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid size-9 place-items-center rounded-lg text-muted hover:text-fg"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <ProfileCard onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/78 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[90rem] items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="grid size-9 place-items-center rounded-lg border border-line bg-card text-muted hover:text-fg xl:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent sm:block">Health intelligence workspace</p>
              <h1 className="truncate font-display text-xl font-semibold tracking-tight text-fg sm:text-2xl">{current?.title ?? "Senzora"}</h1>
              <p className="hidden truncate text-sm text-muted sm:block">{current?.description}</p>
            </div>
            <Link
              href="/insights"
              aria-label={recentFlags > 0 ? `View alerts and insights: ${recentFlags} flagged reading${recentFlags === 1 ? "" : "s"} in the last 7 days` : "View alerts and insights"}
              className="relative grid size-9 place-items-center rounded-lg border border-line bg-card text-muted transition-colors hover:text-fg"
            >
              <Bell className="size-4" aria-hidden="true" />
              {recentFlags > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger" aria-hidden="true" />}
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-7 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

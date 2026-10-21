"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { NAV_ITEMS } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-accent/10 text-accent-bright shadow-[0_0_20px_-8px_var(--glow)]"
                : "text-muted hover:bg-raised hover:text-fg"
            }`}
          >
            <Icon className="size-[1.1rem]" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileCard({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/settings"
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 transition-colors hover:bg-raised"
    >
      <span className="grid size-9 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent-bright" aria-hidden="true">
        H
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-medium text-fg">Hotaru</span>
        <span className="block text-xs text-muted">User profile</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = NAV_ITEMS.find((item) => item.href === pathname);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-line bg-surface p-4 lg:flex">
        <div className="space-y-8">
          <div className="px-2 pt-2">
            <Logo />
          </div>
          <NavLinks />
        </div>
        <ProfileCard />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
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
        <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="grid size-9 place-items-center rounded-lg border border-line bg-card text-muted hover:text-fg lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold tracking-tight text-fg sm:text-2xl">{current?.title ?? "Velune"}</h1>
              <p className="hidden truncate text-sm text-muted sm:block">{current?.description}</p>
            </div>
            <Link
              href="/insights"
              aria-label="View alerts and insights"
              className="grid size-9 place-items-center rounded-lg border border-line bg-card text-muted transition-colors hover:text-fg"
            >
              <Bell className="size-4" aria-hidden="true" />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

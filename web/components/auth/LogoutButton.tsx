"use client";

import { useEffect, useState } from "react";
import { logout } from "@/lib/auth";
import { card, primaryButton, secondaryButton } from "@/components/profile/ui";

/** A Log out button that asks "Are you sure?" before it logs the user out. */
export default function LogoutButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  // Escape closes the question without logging out.
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className ?? secondaryButton}>
        Log out
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onClick={(event) => event.stopPropagation()}
            className={`${card} w-full max-w-sm space-y-4`}
          >
            <h2 id="logout-title" className="text-lg font-semibold text-fg">
              Are you sure you want to log out?
            </h2>
            <p className="text-sm text-fg/70">You will need to log in again to see your readings and chats.</p>
            <div className="flex justify-end gap-3">
              <button type="button" autoFocus onClick={() => setOpen(false)} className={secondaryButton}>
                No
              </button>
              <button type="button" onClick={logout} className={primaryButton}>
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

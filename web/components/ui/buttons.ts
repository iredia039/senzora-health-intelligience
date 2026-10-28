/** Shared button styles: hover, keyboard focus (global outline), pressed and disabled states. */
const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm transition disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

export const primaryButton = `${base} bg-accent-bright font-semibold text-canvas hover:brightness-110 active:scale-[0.98] active:brightness-95`;
export const secondaryButton = `${base} border border-line font-medium text-fg hover:border-muted hover:bg-raised active:scale-[0.98] active:bg-surface`;
export const dangerButton = `${base} border border-danger font-medium text-danger hover:bg-raised active:scale-[0.98]`;
export const textLink =
  "inline-flex items-center gap-1 rounded-md text-sm font-medium text-accent-bright underline-offset-4 hover:underline";

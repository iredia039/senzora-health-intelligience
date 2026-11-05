import { ApiError } from "@/lib/api";

export const card = "rounded-3xl border border-line bg-card/95 p-5 sm:p-6";
export const label = "mb-1.5 block text-sm font-medium text-fg";
export const input =
  "w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg outline-none focus:border-[#5CE1E6] focus:ring-2 focus:ring-[#5CE1E6]/30 disabled:cursor-not-allowed disabled:opacity-60";
export const primaryButton =
  "rounded-xl bg-[#5CE1E6] px-4 py-2.5 text-sm font-semibold text-[#071321] outline-none focus-visible:ring-2 focus-visible:ring-[#5CE1E6]/60 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton =
  "rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-fg outline-none hover:bg-canvas focus-visible:ring-2 focus-visible:ring-[#5CE1E6]/60";

export type Notice = { kind: "ok" | "error"; text: string } | null;

export const toMessage = (err: unknown) => (err instanceof ApiError ? err.message : "Something went wrong. Try again.");

export function Message({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p role="status" className={`text-sm ${notice.kind === "ok" ? "text-emerald-500" : "text-red-500"}`}>
      {notice.text}
    </p>
  );
}

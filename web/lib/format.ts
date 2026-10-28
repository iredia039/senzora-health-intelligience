import type { Reading, ReadingSource } from "@/types";

export const SOURCE_LABEL: Record<ReadingSource, string> = { manual: "Entered by you", device: "Device", demo: "Demo data" };

export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const readingName = (r: Reading) => (r.type === "heart_rate" ? "Heart rate" : "Blood pressure");

export const readingValue = (r: Reading) => (r.type === "heart_rate" ? `${r.bpm} bpm` : `${r.systolic}/${r.diastolic} mmHg`);

/** A value for <input type="datetime-local">, in the person's local time. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

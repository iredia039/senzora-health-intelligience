import { classifyReading } from "@/lib/analysis";
import { readingName } from "@/lib/format";
import type { Reading } from "@/types";

const STATUS = { normal: "In range", caution: "Flagged", urgent: "Urgent" } as const;
const HEADER = [
  "measured_at",
  "vital",
  "systolic_mmhg",
  "diastolic_mmhg",
  "heart_rate_bpm",
  "temperature_celsius",
  "spo2_percent",
  "status",
  "source",
  "notes",
];

/** Quotes a field when needed, and stops spreadsheets from running notes that start like a formula. */
function field(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function readingsToCsv(readings: Reading[]): string {
  const rows = readings.map((r) => [
    r.measuredAt,
    readingName(r),
    r.type === "blood_pressure" ? r.systolic : "",
    r.type === "blood_pressure" ? r.diastolic : "",
    r.type === "heart_rate" ? r.bpm : "",
    r.type === "body_temperature" ? r.celsius.toFixed(1) : "",
    r.type === "blood_oxygen" ? r.spo2 : "",
    STATUS[classifyReading(r).level],
    r.source,
    r.notes ?? "",
  ]);
  // The first character is a byte-order mark so Excel opens the file as UTF-8.
  return "\uFEFF" + [HEADER, ...rows].map((row) => row.map(field).join(",")).join("\r\n") + "\r\n";
}

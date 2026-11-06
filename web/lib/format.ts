import type { Reading, ReadingSource, VitalType } from "@/types";

export const SOURCE_LABEL: Record<ReadingSource, string> = { manual: "Entered by you", device: "Device" };

export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** The order vitals are listed in on screens that show all of them. */
export const VITAL_ORDER: VitalType[] = ["blood_pressure", "heart_rate", "body_temperature", "blood_oxygen"];

export const VITAL_LABEL: Record<VitalType, string> = {
  heart_rate: "Heart rate",
  blood_pressure: "Blood pressure",
  body_temperature: "Body temperature",
  blood_oxygen: "Blood oxygen",
};

/** Lower-case names for use inside sentences. */
export const VITAL_NAME: Record<VitalType, string> = {
  heart_rate: "heart rate",
  blood_pressure: "blood pressure",
  body_temperature: "body temperature",
  blood_oxygen: "blood oxygen",
};

/** Short names for tight spaces, such as counts on the dashboard. */
export const VITAL_SHORT: Record<VitalType, string> = {
  heart_rate: "heart rate",
  blood_pressure: "blood pressure",
  body_temperature: "temperature",
  blood_oxygen: "oxygen",
};

export const VITAL_UNIT: Record<VitalType, string> = { heart_rate: "bpm", blood_pressure: "mmHg", body_temperature: "\u00B0C", blood_oxygen: "%" };

/** Adds the unit to a number: "72 bpm", "36.8 \u00B0C", "97%". */
export const withUnit = (text: string, type: VitalType) => (type === "blood_oxygen" ? `${text}%` : `${text} ${VITAL_UNIT[type]}`);

export const readingName = (r: Reading) => VITAL_LABEL[r.type];

export function readingValue(r: Reading): string {
  switch (r.type) {
    case "heart_rate":
      return withUnit(String(r.bpm), r.type);
    case "blood_pressure":
      return withUnit(`${r.systolic}/${r.diastolic}`, r.type);
    case "body_temperature":
      return withUnit(r.celsius.toFixed(1), r.type);
    case "blood_oxygen":
      return withUnit(String(r.spo2), r.type);
  }
}

/** A value for <input type="datetime-local">, in the person's local time. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

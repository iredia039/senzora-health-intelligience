import type { Preferences, Reading } from "@/types";

const PREFIX = "velune:";
const KEYS = { readings: `${PREFIX}readings`, preferences: `${PREFIX}preferences` } as const;
const CHANGE_EVENT = "velune:storage-change";

export const DEFAULT_PREFERENCES: Preferences = {
  displayName: "Hotaru",
  theme: "system",
  ageGroup: "adult",
  alertsEnabled: true,
};

function read<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    // Missing, blocked, or corrupted storage falls back to defaults.
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

const isReadingList = (v: unknown): v is Reading[] =>
  Array.isArray(v) &&
  v.every(
    (r) =>
      typeof r === "object" &&
      r !== null &&
      typeof (r as Reading).id === "string" &&
      typeof (r as Reading).measuredAt === "string" &&
      ((r as Reading).type === "heart_rate" || (r as Reading).type === "blood_pressure"),
  );

const isPreferences = (v: unknown): v is Preferences =>
  typeof v === "object" && v !== null && typeof (v as Preferences).displayName === "string";

export const loadReadings = (): Reading[] => read(KEYS.readings, [], isReadingList);
export const saveReadings = (readings: Reading[]): boolean => write(KEYS.readings, readings);

export const loadPreferences = (): Preferences => ({
  ...DEFAULT_PREFERENCES,
  ...read<Preferences>(KEYS.preferences, DEFAULT_PREFERENCES, isPreferences),
});
export const savePreferences = (prefs: Preferences): boolean => write(KEYS.preferences, prefs);

/** Subscribe to changes made in this tab or any other tab. Returns an unsubscribe function. */
export function subscribeToStorage(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => e.key === null || e.key.startsWith(PREFIX) ? onChange() : undefined;
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Removes all Velune data, including the saved theme. */
export function resetAllData(): void {
  try {
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
    window.localStorage.removeItem("velune-theme");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* nothing to clear if storage is unavailable */
  }
}

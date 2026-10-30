import type { ChatMessage, Preferences, Reading, ReadingInput } from "@/types";

const PREFIX = "senzora:";
const KEYS = {
  readings: `${PREFIX}readings`,
  preferences: `${PREFIX}preferences`,
  chat: `${PREFIX}chat`,
  consent: `${PREFIX}consent`,
  conversation: `${PREFIX}conversation`,
} as const;
const CHANGE_EVENT = "senzora:storage-change";

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

/** Raw stored strings: stable values that React can compare cheaply to detect changes. */
export const getReadingsSnapshot = (): string => {
  try {
    return window.localStorage.getItem(KEYS.readings) ?? "";
  } catch {
    return "";
  }
};
export const getPreferencesSnapshot = (): string => {
  try {
    return window.localStorage.getItem(KEYS.preferences) ?? "";
  } catch {
    return "";
  }
};

export const loadReadings = (): Reading[] => read(KEYS.readings, [], isReadingList);
export const saveReadings = (readings: Reading[]): boolean => write(KEYS.readings, readings);

export const loadPreferences = (): Preferences => ({
  ...DEFAULT_PREFERENCES,
  ...read<Preferences>(KEYS.preferences, DEFAULT_PREFERENCES, isPreferences),
});
export const savePreferences = (prefs: Preferences): boolean => write(KEYS.preferences, prefs);

/* ---- Assistant conversation: one running chat, kept on this device ---- */

const MAX_CHAT_MESSAGES = 100;

const isChatList = (v: unknown): v is ChatMessage[] =>
  Array.isArray(v) &&
  v.every(
    (m) =>
      typeof m === "object" &&
      m !== null &&
      typeof (m as ChatMessage).id === "string" &&
      typeof (m as ChatMessage).content === "string" &&
      ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant"),
  );

export const getChatSnapshot = (): string => {
  try {
    return window.localStorage.getItem(KEYS.chat) ?? "";
  } catch {
    return "";
  }
};

export const loadChat = (): ChatMessage[] => read(KEYS.chat, [], isChatList);

/** Adds one message and keeps only the newest ones, so the chat can never fill up storage. */
export const appendChatMessage = (message: ChatMessage): boolean => write(KEYS.chat, [...loadChat(), message].slice(-MAX_CHAT_MESSAGES));

/** The id of the server-side conversation this chat belongs to. A new chat has none. */
export const loadConversationId = (): number | null => {
  try {
    const value = Number(window.localStorage.getItem(KEYS.conversation));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

export const saveConversationId = (id: number): boolean => {
  try {
    window.localStorage.setItem(KEYS.conversation, String(id));
    return true;
  } catch {
    return false;
  }
};

export const clearConversationId = (): void => {
  try {
    window.localStorage.removeItem(KEYS.conversation);
  } catch {
    /* nothing to clear if storage is unavailable */
  }
};

/** Starting a new chat also forgets the server conversation, so the next message opens a new one. */
export const clearChat = (): boolean => {
  clearConversationId();
  return write(KEYS.chat, []);
};

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

/** Removes all Senzora data, including the saved theme. */
export function resetAllData(): void {
  try {
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
    window.localStorage.removeItem("senzora-theme");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* nothing to clear if storage is unavailable */
  }
}

/* ---- Reading changes: the only place the vitals screens write to storage ---- */

const newId = () => crypto.randomUUID();

export function addReading(input: ReadingInput): boolean {
  const now = new Date().toISOString();
  const reading = { ...input, id: newId(), source: "manual", createdAt: now, updatedAt: now } as Reading;
  return saveReadings([...loadReadings(), reading]);
}

/** Editing a reading makes it yours, so an edited demo reading becomes a manual one. */
export function updateReading(id: string, input: ReadingInput): boolean {
  const readings = loadReadings();
  const existing = readings.find((r) => r.id === id);
  if (!existing || existing.type !== input.type) return false;
  const next = { ...input, id, source: "manual", createdAt: existing.createdAt, updatedAt: new Date().toISOString() } as Reading;
  return saveReadings(readings.map((r) => (r.id === id ? next : r)));
}

export function deleteReading(id: string): boolean {
  return saveReadings(loadReadings().filter((r) => r.id !== id));
}

/** Ten days of made-up readings, always labelled "demo". They end one hour ago. */
export function addDemoReadings(): boolean {
  const DAY = 86_400_000;
  const end = Date.now() - 3_600_000;
  const stamp = new Date().toISOString();
  const bpm = [72, 75, 70, 78, 74, 76, 73, 80, 77, 74];
  const systolic = [116, 118, 121, 119, 124];
  const diastolic = [76, 77, 79, 78, 81];
  const demo: Reading[] = [];
  bpm.forEach((value, i) => {
    const measuredAt = new Date(end - (bpm.length - 1 - i) * DAY).toISOString();
    demo.push({ id: newId(), type: "heart_rate", bpm: value, measuredAt, source: "demo", createdAt: stamp, updatedAt: stamp });
    if (i % 2 === 0) {
      demo.push({
        id: newId(),
        type: "blood_pressure",
        systolic: systolic[i / 2],
        diastolic: diastolic[i / 2],
        measuredAt,
        source: "demo",
        createdAt: stamp,
        updatedAt: stamp,
      });
    }
  });
  return saveReadings([...loadReadings(), ...demo]);
}

export function removeDemoReadings(): boolean {
  return saveReadings(loadReadings().filter((r) => r.source !== "demo"));
}

/* ---- Assistant consent: saved with a version so changed wording asks again ---- */

const CONSENT_VERSION = 1;

export const hasAssistantConsent = (): boolean => {
  try {
    return window.localStorage.getItem(KEYS.consent) === String(CONSENT_VERSION);
  } catch {
    return false;
  }
};

export const saveAssistantConsent = (): boolean => write(KEYS.consent, CONSENT_VERSION);

export const withdrawAssistantConsent = (): boolean => {
  try {
    window.localStorage.removeItem(KEYS.consent);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
};

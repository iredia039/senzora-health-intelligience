import { VITAL_ORDER } from "@/lib/format";
import { subscribeToSession, userPrefix } from "@/lib/session";
import type { ChatMessage, Preferences, Reading, ReadingInput } from "@/types";

const PREFIX = "senzora:";
const NAMES = ["readings", "preferences", "chat", "consent", "conversation"] as const;
type Name = (typeof NAMES)[number];
const CHANGE_EVENT = "senzora:storage-change";

export const DEFAULT_PREFERENCES: Preferences = {
  displayName: "Hotaru",
  theme: "system",
  ageGroup: "adult",
  alertsEnabled: true,
};

/*
 * Every piece of saved data belongs to one user: the key looks like "senzora:u17:readings".
 * When nobody is logged in there is no key, so nothing is read and nothing is written.
 */

let claimedFor: string | null = null;

/**
 * Older versions saved everything under shared keys like "senzora:readings".
 * The first user who loads the app after the update takes that old data, and the shared keys are removed.
 */
function claimLegacyData(prefix: string): void {
  if (claimedFor === prefix) return;
  claimedFor = prefix;
  try {
    NAMES.forEach((name) => {
      const legacyKey = `${PREFIX}${name}`;
      const legacy = window.localStorage.getItem(legacyKey);
      if (legacy === null) return;
      if (window.localStorage.getItem(`${prefix}${name}`) === null) window.localStorage.setItem(`${prefix}${name}`, legacy);
      window.localStorage.removeItem(legacyKey);
    });
  } catch {
    /* storage unavailable: nothing to claim */
  }
}

function keyFor(name: Name): string | null {
  if (typeof window === "undefined") return null;
  const prefix = userPrefix();
  if (!prefix) return null;
  claimLegacyData(prefix);
  return `${prefix}${name}`;
}

function read<T>(name: Name, fallback: T, isValid: (v: unknown) => v is T): T {
  const key = keyFor(name);
  if (!key) return fallback;
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

function write(name: Name, value: unknown): boolean {
  const key = keyFor(name);
  if (!key) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** The raw stored string for this user, or "" when there is none. */
function snapshot(name: Name): string {
  const key = keyFor(name);
  if (!key) return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
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
      VITAL_ORDER.includes((r as Reading).type),
  );

const isPreferences = (v: unknown): v is Preferences =>
  typeof v === "object" && v !== null && typeof (v as Preferences).displayName === "string";

/** Raw stored strings: stable values that React can compare cheaply to detect changes. */
export const getReadingsSnapshot = (): string => snapshot("readings");
export const getPreferencesSnapshot = (): string => snapshot("preferences");

export const loadReadings = (): Reading[] => read("readings", [], isReadingList);
export const saveReadings = (readings: Reading[]): boolean => write("readings", readings);

export const loadPreferences = (): Preferences => ({
  ...DEFAULT_PREFERENCES,
  ...read<Preferences>("preferences", DEFAULT_PREFERENCES, isPreferences),
});
export const savePreferences = (prefs: Preferences): boolean => write("preferences", prefs);

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

export const getChatSnapshot = (): string => snapshot("chat");

export const loadChat = (): ChatMessage[] => read("chat", [], isChatList);

/** Adds one message and keeps only the newest ones, so the chat can never fill up storage. */
export const appendChatMessage = (message: ChatMessage): boolean => write("chat", [...loadChat(), message].slice(-MAX_CHAT_MESSAGES));

/** The id of the server-side conversation this chat belongs to. A new chat has none. */
export const loadConversationId = (): number | null => {
  const key = keyFor("conversation");
  if (!key) return null;
  try {
    const value = Number(window.localStorage.getItem(key));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

export const saveConversationId = (id: number): boolean => {
  const key = keyFor("conversation");
  if (!key) return false;
  try {
    window.localStorage.setItem(key, String(id));
    return true;
  } catch {
    return false;
  }
};

export const clearConversationId = (): void => {
  const key = keyFor("conversation");
  if (!key) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* nothing to clear if storage is unavailable */
  }
};

/** Starting a new chat also forgets the server conversation, so the next message opens a new one. */
export const clearChat = (): boolean => {
  clearConversationId();
  return write("chat", []);
};

/** Replaces the running chat with a saved server conversation, so the next message continues that conversation. */
export const openSavedChat = (messages: ChatMessage[], conversationId: number): boolean =>
  write("chat", messages.slice(-MAX_CHAT_MESSAGES)) && saveConversationId(conversationId);

/** Subscribe to changes made in this tab or any other tab, and to logins and logouts. Returns an unsubscribe function. */
export function subscribeToStorage(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => (e.key === null || e.key.startsWith(PREFIX) ? onChange() : undefined);
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  const unsubscribeSession = subscribeToSession(onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
    unsubscribeSession();
  };
}

/** Removes all of this user's Senzora data, including the saved theme. */
export function resetAllData(): void {
  try {
    NAMES.forEach((name) => {
      const key = keyFor(name);
      if (key) window.localStorage.removeItem(key);
      window.localStorage.removeItem(`${PREFIX}${name}`);
    });
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

/** An edited reading is always marked as entered by you. */
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



/* ---- Assistant consent: saved with a version so changed wording asks again ---- */

const CONSENT_VERSION = 1;

export const hasAssistantConsent = (): boolean => {
  const key = keyFor("consent");
  if (!key) return false;
  try {
    return window.localStorage.getItem(key) === String(CONSENT_VERSION);
  } catch {
    return false;
  }
};

export const saveAssistantConsent = (): boolean => write("consent", CONSENT_VERSION);

export const withdrawAssistantConsent = (): boolean => {
  const key = keyFor("consent");
  if (!key) return false;
  try {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
};

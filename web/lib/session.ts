/** The saved login: the token and the user's id and name, kept in this browser. */

const TOKEN_KEY = "senzora:token";
const USER_KEY = "senzora:user";
const CHANGE_EVENT = "senzora:session-change";

export type SessionUser = { id: number; name: string };

export function parseSessionUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && typeof (parsed as SessionUser).name === "string") return parsed as SessionUser;
    return null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function loadUser(): SessionUser | null {
  try {
    return parseSessionUser(window.localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

/**
 * The start of every storage key that belongs to the logged-in user, like "senzora:u17:".
 * Each account gets its own prefix, so two accounts in one browser never share data.
 * Returns null when nobody is logged in.
 */
export function userPrefix(): string | null {
  const user = loadUser();
  if (!user || typeof user.id !== "number") return null;
  return `senzora:u${user.id}:`;
}

/** A stable string that changes when the login changes. Empty means nobody is logged in. */
export function getSessionSnapshot(): string {
  try {
    return getToken() ? (window.localStorage.getItem(USER_KEY) ?? "") : "";
  } catch {
    return "";
  }
}

/** Subscribe to logins and logouts in this tab or any other tab. Returns an unsubscribe function. */
export function subscribeToSession(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function saveSession(token: string, user: SessionUser): boolean {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

/** Changes only the saved name. The token and the id stay the same, so nobody is logged out. */
export function updateSessionName(name: string): boolean {
  try {
    const user = loadUser();
    if (!user) return false;
    window.localStorage.setItem(USER_KEY, JSON.stringify({ ...user, name }));
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(): void {
  try {
    // Forget which server conversation this user was in (their chat messages stay saved under their own keys).
    const prefix = userPrefix();
    if (prefix) window.localStorage.removeItem(`${prefix}conversation`);
    window.localStorage.removeItem("senzora:conversation");
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* nothing to clear if storage is unavailable */
  }
}

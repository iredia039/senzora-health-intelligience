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

export function clearSession(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    /* nothing to clear if storage is unavailable */
  }
}

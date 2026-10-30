/** The saved login: the token and the user's id and name, kept in this browser. */

const TOKEN_KEY = "senzora:token";
const USER_KEY = "senzora:user";

export type SessionUser = { id: number; name: string };

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function loadUser(): SessionUser | null {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && typeof (parsed as SessionUser).name === "string") return parsed as SessionUser;
    return null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: SessionUser): boolean {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    return true;
  } catch {
    return false;
  }
}

export function clearSession(): void {
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch {
    /* nothing to clear if storage is unavailable */
  }
}

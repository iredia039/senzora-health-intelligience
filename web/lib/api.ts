import { clearSession, getToken } from "@/lib/session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TIMEOUT_MS = 60_000;

/** An error from the API. status 0 means the request never got an answer. */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Options = { method?: "GET" | "POST"; body?: unknown; auth?: boolean };

function errorMessage(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const { message, error } = data as { message?: unknown; error?: unknown };
  if (typeof message === "string") return message;
  if (typeof error === "string") return error;
  return null;
}

/** The one place the frontend talks to the API. Pass auth: true to send the saved token. */
export async function apiRequest<T>(path: string, { method = "GET", body, auth = false }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
    if (!token) throw new ApiError(401, "You need to log in first.");
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // The response had no JSON body.
  }

  if (!response.ok) {
    // An invalid or expired token means the saved login is no longer good.
    if (auth && response.status === 401) clearSession();
    throw new ApiError(response.status, errorMessage(data) ?? "Something went wrong. Try again.");
  }

  return data as T;
}

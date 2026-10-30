import { ApiError, apiRequest } from "@/lib/api";
import { clearSession, saveSession, type SessionUser } from "@/lib/session";
import { clearChat } from "@/lib/storage";

type LoginResponse = { token: string; user: SessionUser };

export async function register(name: string, email: string, password: string): Promise<void> {
  await apiRequest("/register", { method: "POST", body: { name, email, password } });
}

export async function login(email: string, password: string): Promise<SessionUser> {
  const data = await apiRequest<LoginResponse>("/login", { method: "POST", body: { email, password } });
  if (!saveSession(data.token, data.user)) {
    throw new ApiError(0, "Couldn't save your login. Your browser is blocking storage for this site.");
  }
  return data.user;
}

/** Logging out also clears the chat on this device, so the next person on it does not see it. */
export function logout(): void {
  clearSession();
  clearChat();
}

import { ApiError, apiRequest } from "@/lib/api";
import { clearSession, saveSession, updateSessionName, type SessionUser } from "@/lib/session";
import { clearChat } from "@/lib/storage";

type LoginResponse = { token: string; user: SessionUser };

/** What GET /me and PATCH /me send back. */
export type Profile = { id: number; name: string; email: string };

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

export function getProfile(): Promise<Profile> {
  return apiRequest<Profile>("/me", { auth: true });
}

/** Saves the new name on the server, then in the saved login so the sidebar shows it too. */
export async function updateName(name: string): Promise<Profile> {
  const data = await apiRequest<Profile>("/me", { method: "PATCH", body: { name }, auth: true });
  updateSessionName(data.name);
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest("/me/password", { method: "PATCH", body: { currentPassword, newPassword }, auth: true });
}

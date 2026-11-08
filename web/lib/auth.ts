import { ApiError, apiRequest } from "@/lib/api";
import { clearSession, saveSession, updateSessionName, type SessionUser } from "@/lib/session";
import { clearChat } from "@/lib/storage";

type LoginResponse = { token: string; user: SessionUser };

/** What GET /me and PATCH /me send back. */
export type Profile = { id: number; name: string; email: string };

/** Creates the account as unverified and emails a 6-digit code. The person is not logged in yet. */
export async function register(name: string, email: string, password: string): Promise<void> {
  await apiRequest("/register", { method: "POST", body: { name, email, password } });
}

/** Checks the 6-digit code from the email. After this the account can log in. */
export async function verifyEmail(email: string, code: string): Promise<void> {
  await apiRequest("/verify-email", { method: "POST", body: { email, code } });
}

/** Sends a new code. The server allows one every 60 seconds and answers 429 when it is too soon. */
export async function resendCode(email: string): Promise<void> {
  await apiRequest("/resend-code", { method: "POST", body: { email } });
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

/** Checks both passwords and emails a 6-digit code. The password is not changed yet. */
export async function requestPasswordChange(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest("/me/password/request", { method: "POST", body: { currentPassword, newPassword }, auth: true });
}

/** Checks the code from the email. Only then does the new password take effect. */
export async function confirmPasswordChange(code: string): Promise<void> {
  await apiRequest("/me/password/confirm", { method: "POST", body: { code }, auth: true });
}

/** Emails a 6-digit code if the account exists. The server answers the same way either way. */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest("/forgot-password", { method: "POST", body: { email } });
}

/** Checks the code and saves the new password. The person then logs in as usual. */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await apiRequest("/reset-password", { method: "POST", body: { email, code, newPassword } });
}
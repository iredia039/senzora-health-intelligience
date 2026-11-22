import { ApiError, apiRequest } from "@/lib/api";
import { clearSession, saveSession, updateSessionName, type SessionUser } from "@/lib/session";
import { clearChat } from "@/lib/storage";

type LoginResponse = { token: string; user: SessionUser };

export type Profile = { id: number; name: string; email: string };

/** Register unverified account — sends verification code to email. */
export async function register(name: string, email: string, password: string): Promise<void> {
  await apiRequest("/register", { method: "POST", body: { name, email, password } });
}

/** Verify email with 6-digit code — account can log in after this. */
export async function verifyEmail(email: string, code: string): Promise<void> {
  await apiRequest("/verify-email", { method: "POST", body: { email, code } });
}

/** Resend verification code — server rate-limits to one per 60 s (429). */
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

/** Clear session and local chat. */
export function logout(): void {
  clearSession();
  clearChat();
}

export function getProfile(): Promise<Profile> {
  return apiRequest<Profile>("/me", { auth: true });
}

/** Update display name on server and in the saved session. */
export async function updateName(name: string): Promise<Profile> {
  const data = await apiRequest<Profile>("/me", { method: "PATCH", body: { name }, auth: true });
  updateSessionName(data.name);
  return data;
}

/** Validate both passwords and email a confirmation code — password not changed yet. */
export async function requestPasswordChange(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest("/me/password/request", { method: "POST", body: { currentPassword, newPassword }, auth: true });
}

/** Confirm code and apply new password. */
export async function confirmPasswordChange(code: string): Promise<void> {
  await apiRequest("/me/password/confirm", { method: "POST", body: { code }, auth: true });
}

/** Send reset code if account exists — always responds the same way. */
export async function requestPasswordReset(email: string): Promise<void> {
  await apiRequest("/forgot-password", { method: "POST", body: { email } });
}

/** Confirm reset code and save new password. */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await apiRequest("/reset-password", { method: "POST", body: { email, code, newPassword } });
}
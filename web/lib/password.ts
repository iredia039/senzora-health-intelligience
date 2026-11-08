export function passwordProblem(password: string): string | null {
if (password.length < 8) return "New password must be at least 8 characters.";
if (!/[A-Z]/.test(password)) return "New password must contain at least one capital letter.";
if (!/[0-9]/.test(password)) return "New password must contain at least one number.";
return null;
}
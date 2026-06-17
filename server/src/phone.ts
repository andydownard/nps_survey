// Phone normalization + admin allowlist. Admin numbers are registered out of
// band via the ADMIN_PHONES env var (comma-separated E.164, e.g.
// "+14155551234,+14155555678"), so there's no admin registration flow.

/**
 * Normalize a phone number to E.164-ish (`+` followed by digits). Returns null
 * when there are no digits. Bare 10-digit input is assumed US (+1); an 11-digit
 * number starting with 1 is treated as US too. Anything already starting with
 * `+` is kept as-is (minus non-digits).
 */
export function normalizePhone(input: string | undefined | null): string | null {
  if (!input) return null;
  const hasPlus = input.trim().startsWith('+');
  const digits = input.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (hasPlus) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  return '+' + digits;
}

/** The configured admin allowlist, normalized. Empty when ADMIN_PHONES is unset. */
export function adminAllowlist(): string[] {
  return (process.env.ADMIN_PHONES || '')
    .split(',')
    .map(s => normalizePhone(s))
    .filter((p): p is string => p !== null);
}

/** Whether a normalized phone number is on the admin allowlist. */
export function isAllowedAdmin(phone: string | null): boolean {
  if (!phone) return false;
  return adminAllowlist().includes(phone);
}

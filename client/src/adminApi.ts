import type { ReportData } from './types';

export interface AuthError {
  error: string;
  message: string;
}

/** Thrown by the admin API calls; carries the server's error code + message. */
export class AdminApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function postJson(url: string, body: unknown): Promise<{ phone?: string }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Partial<AuthError>;
    throw new AdminApiError(data.error || 'error', data.message || 'Something went wrong. Try again.');
  }
  return res.json();
}

/** Request an SMS code for an admin phone number. */
export function startAuth(phone: string): Promise<{ phone?: string }> {
  return postJson('/api/admin/auth/start', { phone });
}

/** Verify the SMS code; on success the server sets the session cookie. */
export function checkAuth(phone: string, code: string): Promise<{ phone?: string }> {
  return postJson('/api/admin/auth/check', { phone, code });
}

export async function logout(): Promise<void> {
  await fetch('/api/admin/auth/logout', { method: 'POST' });
}

export async function getSession(): Promise<{ authenticated: boolean; phone?: string }> {
  const res = await fetch('/api/admin/session');
  if (!res.ok) return { authenticated: false };
  return res.json();
}

export async function getReport(): Promise<ReportData> {
  const res = await fetch('/api/admin/report');
  if (!res.ok) throw new AdminApiError('unauthenticated', 'Your session expired. Sign in again.');
  return res.json();
}

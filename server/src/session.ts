// Stateless admin sessions: an HMAC-signed token (payload.signature) stored in
// an httpOnly cookie. No server-side session store — the signature + expiry are
// self-contained. Signed with SESSION_SECRET; if unset, a random per-process
// secret is generated (sessions then reset on restart — fine for dev).
import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export const SESSION_COOKIE = 'admin_session';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

let _secret: string | null = null;
function secret(): string {
  if (_secret) return _secret;
  if (process.env.SESSION_SECRET) {
    _secret = process.env.SESSION_SECRET;
  } else {
    _secret = crypto.randomBytes(32).toString('hex');
    console.warn('[session] SESSION_SECRET not set — using an ephemeral secret; admin sessions reset on restart.');
  }
  return _secret;
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function sign(data: string): string {
  return b64url(crypto.createHmac('sha256', secret()).update(data).digest());
}

interface SessionPayload {
  phone: string;
  exp: number; // epoch ms
}

/** Create a signed session token for an admin phone. */
export function createSessionToken(phone: string, ttlMs: number = DEFAULT_TTL_MS): string {
  const payload: SessionPayload = { phone, exp: Date.now() + ttlMs };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body)}`;
}

/** Verify a token's signature and expiry; returns the payload or null. */
export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(body);
  // Constant-time compare of equal-length signatures.
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Read the session cookie off a request without depending on cookie-parser. */
export function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

/** Set the session cookie (httpOnly, SameSite=Lax, Secure outside dev). */
export function setSessionCookie(res: Response, token: string, ttlMs: number = DEFAULT_TTL_MS): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV !== 'development',
    maxAge: ttlMs,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** Express guard: 401 unless a valid admin session cookie is present. */
export function requireAdminSession(req: Request, res: Response, next: NextFunction): void {
  const payload = verifySessionToken(readSessionCookie(req));
  if (!payload) {
    res.status(401).json({ error: 'unauthenticated' });
    return;
  }
  (req as Request & { adminPhone?: string }).adminPhone = payload.phone;
  next();
}

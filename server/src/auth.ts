// Shared admin-token auth for privileged endpoints (reset, manual digest send).
import crypto from 'crypto';
import type { Request, Response } from 'express';

// Constant-time string compare so the admin token can't be guessed via timing.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Verify the request carries the ADMIN_TOKEN, via `Authorization: Bearer <t>`
 * or `?token=<t>`. Writes the appropriate 403/401 and returns false when the
 * request should be rejected; returns true when authorized. The endpoint is
 * disabled entirely (403) unless ADMIN_TOKEN is set, so it can't be abused by
 * default.
 */
export function requireAdmin(req: Request, res: Response): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    res.status(403).json({ error: 'disabled: ADMIN_TOKEN is not set' });
    return false;
  }
  const bearer = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  const provided = bearer ?? (typeof req.query.token === 'string' ? req.query.token : undefined);
  if (!provided || !safeEqual(provided, token)) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

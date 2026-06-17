import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { getDb } from '../db.js';
import { normalizePhone, isAllowedAdmin } from '../phone.js';
import { isTwilioConfigured, sendVerification, checkVerification } from '../twilio.js';
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  readSessionCookie,
  verifySessionToken,
  requireAdminSession,
} from '../session.js';
import { computeDigest } from '../digest.js';

/** Mask a phone for display: keep country/area hints, hide the middle. */
function maskPhone(phone: string): string {
  return phone.length <= 4 ? phone : `${phone.slice(0, 2)}•••${phone.slice(-4)}`;
}

export function makeAdminRouter(dbGetter: () => Database.Database = getDb) {
  const router = Router();

  // POST /api/admin/auth/start — body { phone }. Sends an SMS code via Twilio
  // Verify, but only to numbers on the ADMIN_PHONES allowlist. Non-admin numbers
  // get a clear, explicit rejection (the allowlist is tiny + internal, so UX
  // clarity beats enumeration-hardening here).
  router.post('/auth/start', async (req: Request, res: Response) => {
    const phone = normalizePhone((req.body as { phone?: string }).phone);
    if (!phone) {
      res.status(400).json({ error: 'invalid_phone', message: 'Enter a valid phone number.' });
      return;
    }
    if (!isAllowedAdmin(phone)) {
      res.status(403).json({
        error: 'not_admin',
        message: "That number isn't registered for admin access. Ask an existing admin to add it.",
      });
      return;
    }
    if (!isTwilioConfigured()) {
      res.status(503).json({ error: 'not_configured', message: 'SMS sign-in is not configured yet.' });
      return;
    }
    try {
      await sendVerification(phone);
      res.json({ ok: true, phone: maskPhone(phone) });
    } catch (err) {
      res.status(502).json({ error: 'send_failed', message: (err as Error).message });
    }
  });

  // POST /api/admin/auth/check — body { phone, code }. On approval, issues the
  // session cookie.
  router.post('/auth/check', async (req: Request, res: Response) => {
    const { phone: rawPhone, code } = req.body as { phone?: string; code?: string };
    const phone = normalizePhone(rawPhone);
    if (!phone || !code) {
      res.status(400).json({ error: 'invalid_request', message: 'Phone and code are required.' });
      return;
    }
    if (!isAllowedAdmin(phone)) {
      res.status(403).json({ error: 'not_admin', message: "That number isn't registered for admin access." });
      return;
    }
    if (!isTwilioConfigured()) {
      res.status(503).json({ error: 'not_configured', message: 'SMS sign-in is not configured yet.' });
      return;
    }
    let approved = false;
    try {
      approved = await checkVerification(phone, code.trim());
    } catch (err) {
      res.status(502).json({ error: 'check_failed', message: (err as Error).message });
      return;
    }
    if (!approved) {
      res.status(401).json({ error: 'invalid_code', message: 'That code is incorrect or expired.' });
      return;
    }
    setSessionCookie(res, createSessionToken(phone));
    res.json({ ok: true, phone: maskPhone(phone) });
  });

  // POST /api/admin/auth/logout
  router.post('/auth/logout', (_req: Request, res: Response) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  // GET /api/admin/session — lightweight check the client uses on load.
  router.get('/session', (req: Request, res: Response) => {
    const payload = verifySessionToken(readSessionCookie(req));
    if (!payload) {
      res.json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true, phone: maskPhone(payload.phone) });
  });

  // GET /api/admin/report — gated daily report data (same numbers as the email
  // digest, so the in-app view and the email never drift).
  router.get('/report', requireAdminSession, (_req: Request, res: Response) => {
    res.json(computeDigest(dbGetter()));
  });

  return router;
}

export const adminRouter = makeAdminRouter();

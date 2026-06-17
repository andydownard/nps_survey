import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { getDb } from '../db.js';
import { requireAdmin } from '../auth.js';
import { sendDigest } from '../digest.js';

export function makeDigestRouter(dbGetter: () => Database.Database = getDb) {
  const router = Router();

  // POST /api/digest/send — fire the digest on demand. Guarded by ADMIN_TOKEN.
  // Useful for verifying Postmark config without waiting for the schedule.
  // Optional query params:
  //   ?range=all  → report over all responses instead of just yesterday.
  //   ?to=a@b.com → override recipients (comma-separated) for a one-off send.
  router.post('/send', async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    const allTime = req.query.range === 'all';
    const toOverride = typeof req.query.to === 'string'
      ? req.query.to.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    try {
      const result = await sendDigest(dbGetter(), new Date(), { allTime, to: toOverride });
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'send failed', detail: (err as Error).message });
    }
  });

  return router;
}

export const digestRouter = makeDigestRouter();

import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { getDb } from '../db.js';
import { requireAdmin } from '../auth.js';
import { sendDigest } from '../digest.js';

export function makeDigestRouter(dbGetter: () => Database.Database = getDb) {
  const router = Router();

  // POST /api/digest/send — fire the daily digest on demand. Guarded by
  // ADMIN_TOKEN; useful for verifying Postmark config without waiting for cron.
  router.post('/send', async (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;
    try {
      const result = await sendDigest(dbGetter());
      res.json(result);
    } catch (err) {
      res.status(502).json({ error: 'send failed', detail: (err as Error).message });
    }
  });

  return router;
}

export const digestRouter = makeDigestRouter();

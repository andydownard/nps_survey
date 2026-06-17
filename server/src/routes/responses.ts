import { Router, Request, Response } from 'express';
import type Database from 'better-sqlite3';
import { getDb } from '../db.js';
import { countScores, npsFromCounts } from '../nps.js';
import { requireAdmin } from '../auth.js';

export function toRelative(isoString: string): string {
  const then = new Date(isoString).getTime();
  const diffMs = Date.now() - then;
  const diffH = Math.floor(diffMs / 3_600_000);
  const diffD = Math.floor(diffMs / 86_400_000);
  if (diffMs < 60_000) return 'Just now';
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  return `${diffD}d ago`;
}

export function makeResponsesRouter(dbGetter: () => Database.Database = getDb) {
  const router = Router();

  // POST /api/responses
  router.post('/', (req: Request, res: Response) => {
    const { score, comment } = req.body as { score: unknown; comment: unknown };

    if (typeof score !== 'number' || score < 0 || score > 10 || !Number.isInteger(score)) {
      res.status(400).json({ error: 'score must be an integer 0–10' });
      return;
    }

    const safeComment = typeof comment === 'string' ? comment.slice(0, 500) : '';
    const db = dbGetter();
    const result = db.prepare('INSERT INTO responses (score, comment) VALUES (?, ?)').run(score, safeComment);
    res.status(201).json({ id: result.lastInsertRowid });
  });

  // GET /api/responses
  router.get('/', (req: Request, res: Response) => {
    const youId = req.query.youId ? Number(req.query.youId) : null;
    const db = dbGetter();

    type Row = { id: number; score: number; comment: string; created_at: string };
    const rows = db.prepare('SELECT id, score, comment, created_at FROM responses ORDER BY created_at DESC').all() as Row[];

    const total = rows.length;
    const counts = countScores(rows.map(r => r.score));
    const nps = npsFromCounts(counts);

    const responses = rows.map(r => ({
      id: r.id,
      score: r.score,
      comment: r.comment,
      when: r.id === youId ? 'Just now' : toRelative(r.created_at),
      you: r.id === youId,
    }));

    res.json({ responses, nps, total, counts });
  });

  // DELETE /api/responses — wipe all responses. Guarded by ADMIN_TOKEN.
  // Disabled entirely unless ADMIN_TOKEN is set, so it can't be abused by default.
  // Auth via `Authorization: Bearer <token>` or `?token=<token>`.
  router.delete('/', (req: Request, res: Response) => {
    if (!requireAdmin(req, res)) return;

    const db = dbGetter();
    const info = db.prepare('DELETE FROM responses').run();
    // Reset the autoincrement counter so ids start at 1 again (best-effort).
    try {
      db.prepare("DELETE FROM sqlite_sequence WHERE name = 'responses'").run();
    } catch {
      // sqlite_sequence may not exist on a brand-new DB; ignore.
    }
    res.json({ deleted: info.changes });
  });

  return router;
}

// Default export uses the real DB singleton
export const responsesRouter = makeResponsesRouter();

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { makeResponsesRouter, toRelative } from './responses.js';
import { cat } from '../nps.js';

// ── helpers ────────────────────────────────────────────────────────────────

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE responses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      score      INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
      comment    TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
  `);
  return db;
}

function makeApp(db: Database.Database) {
  const app = express();
  app.use(express.json());
  app.use('/api/responses', makeResponsesRouter(() => db));
  return app;
}

// ── unit: cat() ────────────────────────────────────────────────────────────

describe('cat()', () => {
  it('classifies 0 as detractor', () => expect(cat(0)).toBe('det'));
  it('classifies 1 as detractor', () => expect(cat(1)).toBe('det'));
  it('classifies 3 as detractor', () => expect(cat(3)).toBe('det'));
  it('classifies 6 as detractor', () => expect(cat(6)).toBe('det'));
  it('classifies 7 as passive',   () => expect(cat(7)).toBe('pas'));
  it('classifies 8 as passive',   () => expect(cat(8)).toBe('pas'));
  it('classifies 9 as promoter',  () => expect(cat(9)).toBe('pro'));
  it('classifies 10 as promoter', () => expect(cat(10)).toBe('pro'));
});

// ── unit: toRelative() ────────────────────────────────────────────────────

describe('toRelative()', () => {
  it('returns "Just now" for timestamps within the last minute', () => {
    const iso = new Date(Date.now() - 30_000).toISOString();
    expect(toRelative(iso)).toBe('Just now');
  });

  it('returns minutes for timestamps within the last hour', () => {
    const iso = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(toRelative(iso)).toBe('5m ago');
  });

  it('returns hours for timestamps within the last day', () => {
    const iso = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(toRelative(iso)).toBe('3h ago');
  });

  it('returns days for older timestamps', () => {
    const iso = new Date(Date.now() - 2 * 86_400_000).toISOString();
    expect(toRelative(iso)).toBe('2d ago');
  });

  it('returns "Just now" for a timestamp exactly 59 seconds ago', () => {
    const iso = new Date(Date.now() - 59_000).toISOString();
    expect(toRelative(iso)).toBe('Just now');
  });

  it('returns "1m ago" for a timestamp exactly 60 seconds ago', () => {
    const iso = new Date(Date.now() - 60_000).toISOString();
    expect(toRelative(iso)).toBe('1m ago');
  });

  it('returns "1h ago" for a timestamp exactly 1 hour ago', () => {
    const iso = new Date(Date.now() - 3_600_000).toISOString();
    expect(toRelative(iso)).toBe('1h ago');
  });

  it('returns "1d ago" for a timestamp exactly 24 hours ago', () => {
    const iso = new Date(Date.now() - 86_400_000).toISOString();
    expect(toRelative(iso)).toBe('1d ago');
  });
});

// ── POST /api/responses ────────────────────────────────────────────────────

describe('POST /api/responses', () => {
  let db: Database.Database;
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    db = makeDb();
    app = makeApp(db);
  });

  it('accepts a valid score with comment and returns id', async () => {
    const res = await request(app)
      .post('/api/responses')
      .send({ score: 9, comment: 'Great bootcamp!' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(typeof res.body.id).toBe('number');
  });

  it('accepts score 0 (minimum valid)', async () => {
    const res = await request(app).post('/api/responses').send({ score: 0, comment: '' });
    expect(res.status).toBe(201);
  });

  it('accepts score 10 (maximum valid)', async () => {
    const res = await request(app).post('/api/responses').send({ score: 10, comment: '' });
    expect(res.status).toBe(201);
  });

  it('accepts score with empty comment (skip path)', async () => {
    const res = await request(app).post('/api/responses').send({ score: 7, comment: '' });
    expect(res.status).toBe(201);
    const row = db.prepare('SELECT * FROM responses WHERE id = ?').get(res.body.id) as any;
    expect(row.comment).toBe('');
  });

  it('persists the response to the database', async () => {
    await request(app).post('/api/responses').send({ score: 8, comment: 'Nice.' });
    const rows = db.prepare('SELECT * FROM responses').all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].score).toBe(8);
    expect(rows[0].comment).toBe('Nice.');
  });

  it('rejects score -1 (below range)', async () => {
    const res = await request(app).post('/api/responses').send({ score: -1, comment: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('rejects score 11 (above range)', async () => {
    const res = await request(app).post('/api/responses').send({ score: 11, comment: '' });
    expect(res.status).toBe(400);
  });

  it('rejects fractional score', async () => {
    const res = await request(app).post('/api/responses').send({ score: 7.5, comment: '' });
    expect(res.status).toBe(400);
  });

  it('rejects string score', async () => {
    const res = await request(app).post('/api/responses').send({ score: 'nine', comment: '' });
    expect(res.status).toBe(400);
  });

  it('rejects missing score', async () => {
    const res = await request(app).post('/api/responses').send({ comment: 'no score' });
    expect(res.status).toBe(400);
  });

  it('truncates comment longer than 500 chars', async () => {
    const longComment = 'x'.repeat(600);
    const res = await request(app).post('/api/responses').send({ score: 5, comment: longComment });
    expect(res.status).toBe(201);
    const row = db.prepare('SELECT comment FROM responses WHERE id = ?').get(res.body.id) as any;
    expect(row.comment.length).toBe(500);
  });

  it('treats missing comment as empty string', async () => {
    const res = await request(app).post('/api/responses').send({ score: 6 });
    expect(res.status).toBe(201);
    const row = db.prepare('SELECT comment FROM responses WHERE id = ?').get(res.body.id) as any;
    expect(row.comment).toBe('');
  });

  it('increments id for each submission', async () => {
    const r1 = await request(app).post('/api/responses').send({ score: 9, comment: '' });
    const r2 = await request(app).post('/api/responses').send({ score: 8, comment: '' });
    expect(r2.body.id).toBe(r1.body.id + 1);
  });
});

// ── GET /api/responses ────────────────────────────────────────────────────

describe('GET /api/responses', () => {
  let db: Database.Database;
  let app: ReturnType<typeof makeApp>;

  function insert(score: number, comment = '', hoursAgo = 1) {
    db.prepare(
      `INSERT INTO responses (score, comment, created_at)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ? || ' hours'))`
    ).run(score, comment, String(-hoursAgo));
  }

  beforeEach(() => {
    db = makeDb();
    app = makeApp(db);
  });

  it('returns empty state when no responses exist', async () => {
    const res = await request(app).get('/api/responses');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
    expect(res.body.nps).toBe(0);
    expect(res.body.responses).toHaveLength(0);
    expect(res.body.counts).toEqual({ pro: 0, pas: 0, det: 0 });
  });

  it('returns all inserted responses', async () => {
    insert(10, 'Great!');
    insert(7, 'OK');
    insert(3, 'Bad');
    const res = await request(app).get('/api/responses');
    expect(res.body.total).toBe(3);
    expect(res.body.responses).toHaveLength(3);
  });

  it('computes NPS correctly: % promoters minus % detractors', async () => {
    // 2 promoters (9,10), 1 passive (8), 1 detractor (3) → (50 - 25) = 25
    insert(9); insert(10); insert(8); insert(3);
    const res = await request(app).get('/api/responses');
    expect(res.body.nps).toBe(25);
    expect(res.body.counts.pro).toBe(2);
    expect(res.body.counts.pas).toBe(1);
    expect(res.body.counts.det).toBe(1);
  });

  it('NPS is 100 when all responses are promoters', async () => {
    insert(9); insert(10); insert(10);
    const res = await request(app).get('/api/responses');
    expect(res.body.nps).toBe(100);
  });

  it('NPS is -100 when all responses are detractors', async () => {
    insert(0); insert(2); insert(6);
    const res = await request(app).get('/api/responses');
    expect(res.body.nps).toBe(-100);
  });

  it('NPS is 0 when passives only', async () => {
    insert(7); insert(8);
    const res = await request(app).get('/api/responses');
    expect(res.body.nps).toBe(0);
  });

  it('annotates the correct response as you when youId is provided', async () => {
    insert(9, 'mine');
    insert(7, 'theirs');
    const allRes = await request(app).get('/api/responses');
    const myId = allRes.body.responses.find((r: any) => r.comment === 'mine').id;

    const res = await request(app).get(`/api/responses?youId=${myId}`);
    const mine = res.body.responses.find((r: any) => r.id === myId);
    const theirs = res.body.responses.find((r: any) => r.id !== myId);
    expect(mine.you).toBe(true);
    expect(mine.when).toBe('Just now');
    expect(theirs.you).toBe(false);
  });

  it('returns you=false for all when no youId is provided', async () => {
    insert(9); insert(7);
    const res = await request(app).get('/api/responses');
    expect(res.body.responses.every((r: any) => r.you === false)).toBe(true);
  });

  it('returns you=false for all when youId does not match any row', async () => {
    insert(9);
    const res = await request(app).get('/api/responses?youId=9999');
    expect(res.body.responses.every((r: any) => r.you === false)).toBe(true);
  });

  it('orders responses by created_at descending (newest first)', async () => {
    insert(10, 'oldest', 10);
    insert(9,  'newest', 1);
    const res = await request(app).get('/api/responses');
    expect(res.body.responses[0].comment).toBe('newest');
    expect(res.body.responses[1].comment).toBe('oldest');
  });

  it('each response has required fields', async () => {
    insert(8, 'test comment');
    const res = await request(app).get('/api/responses');
    const r = res.body.responses[0];
    expect(r).toHaveProperty('id');
    expect(r).toHaveProperty('score');
    expect(r).toHaveProperty('comment');
    expect(r).toHaveProperty('when');
    expect(r).toHaveProperty('you');
  });

  it('handles a single all-scores distribution correctly', async () => {
    for (let s = 0; s <= 10; s++) insert(s);
    const res = await request(app).get('/api/responses');
    expect(res.body.total).toBe(11);
    // scores 9,10 = 2 pro; 7,8 = 2 pas; 0-6 = 7 det
    expect(res.body.counts.pro).toBe(2);
    expect(res.body.counts.pas).toBe(2);
    expect(res.body.counts.det).toBe(7);
    const expectedNps = Math.round((2 / 11) * 100 - (7 / 11) * 100);
    expect(res.body.nps).toBe(expectedNps);
  });
});

// ── DELETE /api/responses (admin reset) ─────────────────────────────────────

describe('DELETE /api/responses', () => {
  let db: Database.Database;
  let app: ReturnType<typeof makeApp>;
  const TOKEN = 'super-secret-token';

  function seed() {
    db.prepare('INSERT INTO responses (score, comment) VALUES (?, ?)').run(9, 'a');
    db.prepare('INSERT INTO responses (score, comment) VALUES (?, ?)').run(3, 'b');
  }

  beforeEach(() => {
    db = makeDb();
    app = makeApp(db);
    seed();
  });

  afterEach(() => {
    delete process.env.ADMIN_TOKEN;
  });

  it('is disabled (403) when ADMIN_TOKEN is not set', async () => {
    delete process.env.ADMIN_TOKEN;
    const res = await request(app).delete('/api/responses');
    expect(res.status).toBe(403);
    expect(db.prepare('SELECT COUNT(*) n FROM responses').get()).toMatchObject({ n: 2 });
  });

  it('rejects (401) when no token is provided', async () => {
    process.env.ADMIN_TOKEN = TOKEN;
    const res = await request(app).delete('/api/responses');
    expect(res.status).toBe(401);
    expect(db.prepare('SELECT COUNT(*) n FROM responses').get()).toMatchObject({ n: 2 });
  });

  it('rejects (401) when the token is wrong', async () => {
    process.env.ADMIN_TOKEN = TOKEN;
    const res = await request(app)
      .delete('/api/responses')
      .set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
    expect(db.prepare('SELECT COUNT(*) n FROM responses').get()).toMatchObject({ n: 2 });
  });

  it('wipes all rows with a correct bearer token', async () => {
    process.env.ADMIN_TOKEN = TOKEN;
    const res = await request(app)
      .delete('/api/responses')
      .set('Authorization', `Bearer ${TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: 2 });
    expect(db.prepare('SELECT COUNT(*) n FROM responses').get()).toMatchObject({ n: 0 });
  });

  it('accepts the token via ?token= query as well', async () => {
    process.env.ADMIN_TOKEN = TOKEN;
    const res = await request(app).delete(`/api/responses?token=${TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.deleted).toBe(2);
  });

  it('resets ids so the next insert starts at 1', async () => {
    process.env.ADMIN_TOKEN = TOKEN;
    await request(app).delete('/api/responses').set('Authorization', `Bearer ${TOKEN}`);
    const res = await request(app).post('/api/responses').send({ score: 10, comment: 'fresh' });
    expect(res.body.id).toBe(1);
  });
});

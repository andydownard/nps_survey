import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import { makeDigestRouter } from './digest.js';

const TOKEN = 'test-admin-token';

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      score INTEGER NOT NULL,
      comment TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    )`);
  return db;
}

function makeApp(db: Database.Database) {
  const app = express();
  app.use(express.json());
  app.use('/api/digest', makeDigestRouter(() => db));
  return app;
}

describe('POST /api/digest/send', () => {
  let app: express.Express;
  beforeEach(() => { app = makeApp(makeDb()); });
  afterEach(() => {
    delete process.env.ADMIN_TOKEN;
    delete process.env.POSTMARK_SERVER_TOKEN;
  });

  it('is disabled (403) when ADMIN_TOKEN is not set', async () => {
    const res = await request(app).post('/api/digest/send');
    expect(res.status).toBe(403);
  });

  it('rejects (401) with a wrong token', async () => {
    process.env.ADMIN_TOKEN = TOKEN;
    const res = await request(app).post('/api/digest/send').set('Authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });

  it('authorizes and no-ops (skipped) when Postmark is not configured', async () => {
    process.env.ADMIN_TOKEN = TOKEN;
    const res = await request(app).post(`/api/digest/send?token=${TOKEN}`);
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true);
    expect(res.body.reason).toContain('POSTMARK_SERVER_TOKEN');
  });

  it('accepts range=all and a to= override (still gated, no-ops without Postmark)', async () => {
    process.env.ADMIN_TOKEN = TOKEN;
    const res = await request(app).post(`/api/digest/send?token=${TOKEN}&range=all&to=sample@example.com`);
    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(true); // no POSTMARK token in tests
  });
});

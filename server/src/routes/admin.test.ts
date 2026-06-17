import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';

// Mock Twilio so no network calls happen. Code "123456" is treated as valid.
vi.mock('../twilio.js', () => ({
  isTwilioConfigured: () => true,
  sendVerification: vi.fn(async () => {}),
  checkVerification: vi.fn(async (_phone: string, code: string) => code === '123456'),
}));

import { makeAdminRouter } from './admin.js';
import { sendVerification } from '../twilio.js';

const ADMIN = '+14155551234';

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    score INTEGER NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')))`);
  return db;
}

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', makeAdminRouter(() => makeDb()));
  return app;
}

describe('admin auth + report', () => {
  let app: express.Express;
  beforeEach(() => {
    app = makeApp();
    process.env.SESSION_SECRET = 'test-secret-cccccccccccccccc';
    process.env.ADMIN_PHONES = ADMIN;
    vi.clearAllMocks();
  });
  afterEach(() => {
    delete process.env.SESSION_SECRET;
    delete process.env.ADMIN_PHONES;
  });

  it('rejects a non-admin number with a clear message and sends no code', async () => {
    const res = await request(app).post('/api/admin/auth/start').send({ phone: '+19998887777' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('not_admin');
    expect(res.body.message).toMatch(/registered for admin access/i);
    expect(sendVerification).not.toHaveBeenCalled();
  });

  it('400s on an unparseable phone', async () => {
    const res = await request(app).post('/api/admin/auth/start').send({ phone: 'nope' });
    expect(res.status).toBe(400);
  });

  it('sends a code to an allowlisted number', async () => {
    const res = await request(app).post('/api/admin/auth/start').send({ phone: '415-555-1234' });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(sendVerification).toHaveBeenCalledWith(ADMIN);
  });

  it('rejects a wrong code', async () => {
    const res = await request(app).post('/api/admin/auth/check').send({ phone: ADMIN, code: '000000' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid_code');
  });

  it('gates the report behind a session and grants it after a correct code', async () => {
    // Unauthenticated → 401.
    const noAuth = await request(app).get('/api/admin/report');
    expect(noAuth.status).toBe(401);

    // Correct code → Set-Cookie.
    const check = await request(app).post('/api/admin/auth/check').send({ phone: ADMIN, code: '123456' });
    expect(check.status).toBe(200);
    const cookie = check.headers['set-cookie'];
    expect(cookie).toBeTruthy();

    // With the cookie → 200 and digest shape.
    const report = await request(app).get('/api/admin/report').set('Cookie', cookie);
    expect(report.status).toBe(200);
    expect(report.body).toHaveProperty('nps');
    expect(report.body).toHaveProperty('counts');
    expect(report.body).toHaveProperty('total');

    // session endpoint reflects auth + masks the number.
    const sess = await request(app).get('/api/admin/session').set('Cookie', cookie);
    expect(sess.body.authenticated).toBe(true);
    expect(sess.body.phone).not.toContain('5551234');
  });
});

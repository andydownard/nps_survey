import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { computeDigest, renderDigest } from './digest.js';

function makeDb(): Database.Database {
  const db = new Database(':memory:');
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

function add(db: Database.Database, score: number, comment: string, createdAt: string) {
  db.prepare('INSERT INTO responses (score, comment, created_at) VALUES (?, ?, ?)').run(score, comment, createdAt);
}

// Fixed clock: report runs on 2026-06-17, so "yesterday" is 2026-06-16 (UTC).
const NOW = new Date('2026-06-17T07:00:00Z');
const YDAY = '2026-06-16';

describe('computeDigest()', () => {
  it('summarizes only yesterday and computes NPS for that day', () => {
    const db = makeDb();
    // Yesterday: 2 promoters, 1 passive, 1 detractor → NPS = 50 - 25 = 25.
    add(db, 10, 'love it', `${YDAY}T21:15:00Z`);
    add(db, 9, '', `${YDAY}T20:00:00Z`);
    add(db, 8, '', `${YDAY}T18:00:00Z`);
    add(db, 3, 'too fast', `${YDAY}T11:42:00Z`);
    // Today and two days ago — must be excluded from the report day.
    add(db, 0, 'ignore me', '2026-06-17T01:00:00Z');
    add(db, 10, 'old', '2026-06-15T10:00:00Z');

    const d = computeDigest(db, NOW);
    expect(d.total).toBe(4);
    expect(d.counts).toEqual({ pro: 2, pas: 1, det: 1 });
    expect(d.nps).toBe(25);
    expect(d.pct).toEqual({ pro: 50, pas: 25, det: 25 });
    expect(d.dateLabel).toBe('Tue, Jun 16');
    expect(d.dateLong).toBe('Tuesday, June 16');
  });

  it('returns an empty-but-valid shape when there were no responses', () => {
    const db = makeDb();
    add(db, 10, 'today only', '2026-06-17T02:00:00Z');
    const d = computeDigest(db, NOW);
    expect(d.total).toBe(0);
    expect(d.nps).toBe(0);
    expect(d.detractors).toEqual([]);
    expect(d.topPromoter).toBeNull();
    expect(d.trend).toBeNull();
  });

  it('computes a 7-day average and trend from prior days only', () => {
    const db = makeDb();
    // Report day: single promoter → NPS +100.
    add(db, 10, '', `${YDAY}T12:00:00Z`);
    // One prior day with a single detractor → daily NPS -100. avg7 = -100.
    add(db, 0, '', '2026-06-15T12:00:00Z');
    const d = computeDigest(db, NOW);
    expect(d.nps).toBe(100);
    expect(d.avg7).toBe(-100);
    expect(d.trend).toBe(200);
  });

  it('all-time scope ignores the date window and drops the trend', () => {
    const db = makeDb();
    add(db, 10, 'today', '2026-06-17T02:00:00Z');   // today
    add(db, 9, 'yesterday', `${YDAY}T12:00:00Z`);   // yesterday
    add(db, 0, 'old', '2026-06-10T12:00:00Z');      // a week ago
    const d = computeDigest(db, NOW, { allTime: true });
    expect(d.scope).toBe('all');
    expect(d.total).toBe(3);                          // every response, not just yesterday
    expect(d.dateLabel).toBe('All time');
    expect(d.avg7).toBeNull();
    expect(d.trend).toBeNull();
  });

  it('picks detractor comments and the highest-scoring promoter quote', () => {
    const db = makeDb();
    add(db, 9, 'good', `${YDAY}T22:00:00Z`);
    add(db, 10, 'the best', `${YDAY}T21:00:00Z`);
    add(db, 3, 'pace too fast', `${YDAY}T11:00:00Z`);
    add(db, 5, '', `${YDAY}T10:00:00Z`); // detractor with no comment → excluded
    const d = computeDigest(db, NOW);
    expect(d.detractors.map(q => q.comment)).toEqual(['pace too fast']);
    expect(d.topPromoter?.score).toBe(10);
    expect(d.topPromoter?.comment).toBe('the best');
  });
});

describe('renderDigest()', () => {
  it('produces a subject, HTML and text body with the headline number', () => {
    const db = makeDb();
    add(db, 10, 'great', `${YDAY}T21:00:00Z`);
    add(db, 2, 'rough', `${YDAY}T11:00:00Z`);
    const d = computeDigest(db, NOW);
    const { subject, html, text } = renderDigest(d, { dashboardUrl: 'https://nps.example.com' });

    expect(subject).toBe('Daily NPS report — Tue, Jun 16');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('https://nps.example.com');
    expect(html).toContain('Needs attention');
    expect(text).toContain('DAILY NPS REPORT');
    expect(text).toContain('rough');
  });

  it('escapes HTML in user comments', () => {
    const db = makeDb();
    add(db, 2, '<script>alert(1)</script>', `${YDAY}T11:00:00Z`);
    const d = computeDigest(db, NOW);
    const { html } = renderDigest(d);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders a graceful empty state for a day with no responses', () => {
    const db = makeDb();
    const d = computeDigest(db, NOW);
    const { html, text } = renderDigest(d);
    expect(html).toContain('No responses yesterday');
    expect(text).toContain('No responses yesterday');
  });
});

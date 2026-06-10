import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { seedIfEmpty } from './seed.js';

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

describe('seedIfEmpty()', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = makeDb();
  });

  it('inserts rows into an empty database', () => {
    seedIfEmpty(db);
    const count = (db.prepare('SELECT COUNT(*) as n FROM responses').get() as { n: number }).n;
    expect(count).toBeGreaterThan(0);
  });

  it('inserts exactly 46 seed rows', () => {
    seedIfEmpty(db);
    const count = (db.prepare('SELECT COUNT(*) as n FROM responses').get() as { n: number }).n;
    expect(count).toBe(46);
  });

  it('is idempotent — does not insert twice when called again', () => {
    seedIfEmpty(db);
    seedIfEmpty(db);
    const count = (db.prepare('SELECT COUNT(*) as n FROM responses').get() as { n: number }).n;
    expect(count).toBe(46);
  });

  it('does not insert when rows already exist', () => {
    db.prepare('INSERT INTO responses (score, comment) VALUES (?, ?)').run(10, 'manual row');
    seedIfEmpty(db);
    const count = (db.prepare('SELECT COUNT(*) as n FROM responses').get() as { n: number }).n;
    expect(count).toBe(1);
  });

  it('all scores are in valid range 0–10', () => {
    seedIfEmpty(db);
    const invalid = db.prepare('SELECT COUNT(*) as n FROM responses WHERE score < 0 OR score > 10').get() as { n: number };
    expect(invalid.n).toBe(0);
  });

  it('includes promoters (score 9–10)', () => {
    seedIfEmpty(db);
    const pro = db.prepare('SELECT COUNT(*) as n FROM responses WHERE score >= 9').get() as { n: number };
    expect(pro.n).toBeGreaterThan(0);
  });

  it('includes passives (score 7–8)', () => {
    seedIfEmpty(db);
    const pas = db.prepare('SELECT COUNT(*) as n FROM responses WHERE score BETWEEN 7 AND 8').get() as { n: number };
    expect(pas.n).toBeGreaterThan(0);
  });

  it('includes detractors (score 0–6)', () => {
    seedIfEmpty(db);
    const det = db.prepare('SELECT COUNT(*) as n FROM responses WHERE score <= 6').get() as { n: number };
    expect(det.n).toBeGreaterThan(0);
  });

  it('seed produces a positive NPS (promoters > detractors)', () => {
    seedIfEmpty(db);
    const total = (db.prepare('SELECT COUNT(*) as n FROM responses').get() as { n: number }).n;
    const pro = (db.prepare('SELECT COUNT(*) as n FROM responses WHERE score >= 9').get() as { n: number }).n;
    const det = (db.prepare('SELECT COUNT(*) as n FROM responses WHERE score <= 6').get() as { n: number }).n;
    const nps = Math.round((pro / total) * 100 - (det / total) * 100);
    expect(nps).toBeGreaterThan(0);
  });

  it('all created_at values are valid ISO 8601 timestamps', () => {
    seedIfEmpty(db);
    const rows = db.prepare('SELECT created_at FROM responses').all() as { created_at: string }[];
    for (const row of rows) {
      const d = new Date(row.created_at);
      expect(isNaN(d.getTime())).toBe(false);
    }
  });

  it('all comments are strings (not null)', () => {
    seedIfEmpty(db);
    const nullComments = db.prepare('SELECT COUNT(*) as n FROM responses WHERE comment IS NULL').get() as { n: number };
    expect(nullComments.n).toBe(0);
  });

  it('some rows have non-empty comments', () => {
    seedIfEmpty(db);
    const withComment = db.prepare("SELECT COUNT(*) as n FROM responses WHERE comment != ''").get() as { n: number };
    expect(withComment.n).toBeGreaterThan(0);
  });

  it('some rows have empty comments', () => {
    seedIfEmpty(db);
    const noComment = db.prepare("SELECT COUNT(*) as n FROM responses WHERE comment = ''").get() as { n: number };
    expect(noComment.n).toBeGreaterThan(0);
  });

  it('has 30 promoter rows (score 9 or 10)', () => {
    seedIfEmpty(db);
    const pro = db.prepare('SELECT COUNT(*) as n FROM responses WHERE score >= 9').get() as { n: number };
    expect(pro.n).toBe(30);
  });

  it('has 11 passive rows (score 7 or 8)', () => {
    seedIfEmpty(db);
    const pas = db.prepare('SELECT COUNT(*) as n FROM responses WHERE score BETWEEN 7 AND 8').get() as { n: number };
    expect(pas.n).toBe(11);
  });
});

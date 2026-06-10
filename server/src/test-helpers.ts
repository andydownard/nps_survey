import Database from 'better-sqlite3';
import express from 'express';
import { responsesRouter } from './routes/responses.js';

export function makeTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS responses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      score      INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
      comment    TEXT    NOT NULL DEFAULT '',
      created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    )
  `);
  return db;
}

export function makeTestApp(db: Database.Database) {
  // Patch the db module to return our in-memory db for this test
  const app = express();
  app.use(express.json());
  // Inject db into the router by replacing the module import
  app.use('/api/responses', (req, res, next) => {
    (req as any).__db = db;
    next();
  }, responsesRouter);
  return app;
}

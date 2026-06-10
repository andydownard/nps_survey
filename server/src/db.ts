import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedIfEmpty } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// NPS_DB_PATH lets tests (and other tooling) point at a throwaway database.
const DB_PATH = process.env.NPS_DB_PATH ?? path.join(__dirname, '../data/nps.db');
const DATA_DIR = path.dirname(DB_PATH);

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    // The data dir is gitignored, so ensure it exists on a fresh deploy.
    fs.mkdirSync(DATA_DIR, { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.exec(`
      CREATE TABLE IF NOT EXISTS responses (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        score      INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
        comment    TEXT    NOT NULL DEFAULT '',
        created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `);
    seedIfEmpty(_db);
  }
  return _db;
}

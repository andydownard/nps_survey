import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Where the SQLite file lives, in priority order:
//   1. NPS_DB_PATH         — explicit override (tests point at a throwaway DB).
//   2. RAILWAY_VOLUME_MOUNT_PATH — set automatically when a Railway volume is
//      attached, so data survives redeploys/restarts.
//   3. ../data/nps.db      — local default (gitignored).
function resolveDbPath(): string {
  if (process.env.NPS_DB_PATH) return process.env.NPS_DB_PATH;
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'nps.db');
  }
  return path.join(__dirname, '../data/nps.db');
}

const DB_PATH = resolveDbPath();
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
  }
  return _db;
}

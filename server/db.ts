import Database from 'better-sqlite3';
import path from 'node:path';

// Store DB in the project root's /data directory
const DB_PATH = process.env.DB_PATH || path.join(import.meta.dirname, '..', 'data', 'chunitrrracker.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    genre TEXT NOT NULL DEFAULT '',
    version TEXT NOT NULL DEFAULT '',
    jacket_url TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS charts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id INTEGER NOT NULL REFERENCES songs(id),
    difficulty TEXT NOT NULL,
    constant REAL NOT NULL,
    level TEXT NOT NULL,
    note_count INTEGER NOT NULL DEFAULT 0,
    charter TEXT NOT NULL DEFAULT '',
    UNIQUE(song_id, difficulty)
  );

  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    kamaitachi_id INTEGER,
    last_synced_at INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id),
    chart_id INTEGER NOT NULL REFERENCES charts(id),
    score INTEGER NOT NULL,
    lamp TEXT NOT NULL,
    op INTEGER NOT NULL,
    time_achieved INTEGER NOT NULL DEFAULT 0,
    UNIQUE(player_id, chart_id, score, lamp)
  );

  CREATE INDEX IF NOT EXISTS idx_scores_player ON scores(player_id);
  CREATE INDEX IF NOT EXISTS idx_scores_chart ON scores(chart_id);
  CREATE INDEX IF NOT EXISTS idx_scores_op ON scores(op DESC);
`);

export default db;

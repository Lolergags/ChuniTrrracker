import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';

describe('Database Schema Migration Logic', () => {
  it('should cleanly migrate an existing database missing the charts version column without throwing errors', () => {
    const db = new Database(':memory:');
    
    // Simulate an old database schema without the version column on charts
    db.exec(`
      CREATE TABLE songs (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        version TEXT NOT NULL
      );
      CREATE TABLE charts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER NOT NULL REFERENCES songs(id),
        difficulty TEXT NOT NULL,
        constant REAL NOT NULL,
        level TEXT NOT NULL
      );
    `);

    // Insert legacy data
    db.exec(`INSERT INTO songs (id, title, version) VALUES (1, 'Legacy Song', 'AIR');`);
    db.exec(`INSERT INTO charts (id, song_id, difficulty, constant, level) VALUES (10, 1, 'MAS', 14.0, '14');`);

    // Run the migration sequence from server/db.ts
    expect(() => {
      try {
        db.exec(`ALTER TABLE charts ADD COLUMN version TEXT NOT NULL DEFAULT ''`);
      } catch (e: any) {
        if (!e.message.includes('duplicate column name')) throw e;
      }

      db.exec(`UPDATE charts SET version = (SELECT songs.version FROM songs WHERE songs.id = charts.song_id) WHERE version = '' OR version IS NULL`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_charts_version ON charts(version)`);
    }).not.toThrow();

    // Verify column exists and backfill populated the chart version
    const chart = db.prepare(`SELECT * FROM charts WHERE id = 10`).get() as any;
    expect(chart.version).toBe('AIR');
  });
});

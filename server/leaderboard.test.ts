import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

describe('Leaderboard Query Edge Cases', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    
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
        UNIQUE(player_id, chart_id)
      );
    `);
  });

  it('should correctly handle a player with 0 scores (preventing null OP percent crashes)', () => {
    // Insert mock data for charts to establish totalPossibleOp
    db.prepare(`INSERT INTO songs (id, title, artist) VALUES (1, 'Test Song', 'Test Artist')`).run();
    db.prepare(`INSERT INTO charts (song_id, difficulty, constant, level) VALUES (1, 'MAS', 14.5, '14')`).run();

    // Insert a player with NO scores
    db.prepare(`INSERT INTO players (username) VALUES ('EmptyPlayer')`).run();

    const limit = 50;
    const offset = 0;
    const totalPossibleOp = 10000; // Mock total possible OP

    const playersQuery = db.prepare(`
      SELECT p.username, 
             SUM(max_scores.max_op) as total_op,
             ROUND((SUM(max_scores.max_op) / ?) * 100, 2) as op_percent,
             IFNULL(lamp_counts.sss_count, 0) as sss_count,
             IFNULL(lamp_counts.ss_count, 0) as ss_count,
             IFNULL(lamp_counts.s_plus_count, 0) as s_plus_count,
             IFNULL(lamp_counts.s_count, 0) as s_count
      FROM players p
      LEFT JOIN (
        SELECT s.player_id, c.song_id, MAX(s.op) as max_op
        FROM scores s
        JOIN charts c ON s.chart_id = c.id
        GROUP BY s.player_id, c.song_id
      ) max_scores ON p.id = max_scores.player_id
      LEFT JOIN (
        SELECT 
          player_id,
          SUM(CASE WHEN max_score >= 1007500 THEN 1 ELSE 0 END) as sss_count,
          SUM(CASE WHEN max_score >= 1000000 THEN 1 ELSE 0 END) as ss_count,
          SUM(CASE WHEN max_score >= 990000 THEN 1 ELSE 0 END) as s_plus_count,
          SUM(CASE WHEN max_score >= 975000 THEN 1 ELSE 0 END) as s_count
        FROM (
          SELECT s.player_id, c.id as chart_id, s.score as max_score
          FROM scores s
          JOIN charts c ON s.chart_id = c.id
          WHERE c.difficulty IN ('MAS', 'ULT')
        )
        GROUP BY player_id
      ) lamp_counts ON p.id = lamp_counts.player_id
      GROUP BY p.id
      ORDER BY total_op DESC
      LIMIT ? OFFSET ?
    `).all(totalPossibleOp * 10000, limit, offset) as any[];

    expect(playersQuery.length).toBe(1);
    const row = playersQuery[0];

    // Ensure we handle SQLite returning null for SUM on empty sets
    expect(row.total_op).toBeNull();
    expect(row.op_percent).toBeNull();

    // Replicate backend fallback logic
    const mappedResult = {
      username: row.username,
      totalOp: (row.total_op || 0) / 10000,
      opPercent: row.op_percent || 0,
      possession: 'None'
    };

    expect(mappedResult.totalOp).toBe(0);
    expect(mappedResult.opPercent).toBe(0);
    
    // Validate we don't crash when strictly calling toFixed (what the UI does)
    expect(mappedResult.opPercent.toFixed(2)).toBe("0.00");
  });
});

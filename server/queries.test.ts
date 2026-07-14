import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

describe('Chart Leaderboard Queries', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    
    // Set up schema for the test
    db.exec(`
      CREATE TABLE players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL
      );
      CREATE TABLE charts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER NOT NULL,
        difficulty TEXT NOT NULL,
        constant REAL
      );
      CREATE TABLE scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        chart_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        lamp TEXT,
        op REAL,
        time_achieved INTEGER
      );
    `);

    // Insert dummy data
    db.prepare('INSERT INTO players (username) VALUES (?)').run('Possession_Rainbow');
    db.prepare('INSERT INTO charts (song_id, difficulty, constant) VALUES (?, ?, ?)').run(1, 'MAS', 15.0);

    // Insert DUPLICATE scores for the same chart by the same player
    const insertScore = db.prepare('INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved) VALUES (?, ?, ?, ?, ?, ?)');
    insertScore.run(1, 1, 1010000, 'CLEAR', 75000, 100);
    insertScore.run(1, 1, 1010000, 'CLEAR', 75000, 200);
    insertScore.run(1, 1, 1010000, 'CLEAR', 75000, 300);
  });

  it('should not return duplicate rows for the same player in a chart leaderboard', () => {
    const songId = 1;
    const difficulty = 'MAS';
    const limit = 10;
    const offset = 0;

    // The fixed query using GROUP BY p.id
    const leaderboard = db.prepare(`
      SELECT p.username, MAX(s.score) as score, s.lamp, s.op, MIN(s.time_achieved) as timeAchieved
      FROM scores s
      JOIN players p ON s.player_id = p.id
      JOIN charts c ON s.chart_id = c.id
      WHERE c.song_id = ? AND c.difficulty = ?
      GROUP BY p.id
      ORDER BY score DESC, timeAchieved ASC
      LIMIT ? OFFSET ?
    `).all(songId, difficulty, limit, offset);

    // Since the player has 3 duplicate scores, if we didn't GROUP BY, it would return 3 rows.
    // With GROUP BY, it should strictly return 1.
    expect(leaderboard.length).toBe(1);
    expect(leaderboard[0]).toMatchObject({
      username: 'Possession_Rainbow',
      score: 1010000
    });
  });

  it('performance aggregates should correctly group and max scores per player before aggregating', () => {
    // Add another player with scores on the same chart
    db.prepare('INSERT INTO players (username) VALUES (?)').run('Player_2');
    const insertScore = db.prepare('INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved) VALUES (?, ?, ?, ?, ?, ?)');
    
    // Player 2 plays chart 1 twice: 900k (FAILED), then 1M (FC)
    insertScore.run(2, 1, 900000, 'FAILED', 50000, 400);
    insertScore.run(2, 1, 1000000, 'FC', 70000, 500);

    // Get lamp distribution (should count Player 2's FC, not the FAILED)
    const lamps = db.prepare(`
      SELECT 
        c.constant,
        SUM(CASE WHEN s.lamp = 'AJC' THEN 1 ELSE 0 END) as ajc,
        SUM(CASE WHEN s.lamp = 'AJ' THEN 1 ELSE 0 END) as aj,
        SUM(CASE WHEN s.lamp = 'FC' THEN 1 ELSE 0 END) as fc,
        SUM(CASE WHEN s.lamp = 'CLEAR' THEN 1 ELSE 0 END) as clear,
        SUM(CASE WHEN s.lamp = 'FAILED' THEN 1 ELSE 0 END) as failed,
        COUNT(*) as total
      FROM (
        SELECT player_id, chart_id, MAX(score) as score, lamp
        FROM scores
        GROUP BY player_id, chart_id
      ) s
      JOIN charts c ON s.chart_id = c.id
      WHERE c.difficulty IN ('MAS', 'ULT')
      GROUP BY c.constant
    `).all();

    expect(lamps.length).toBe(1);
    expect(lamps[0]).toMatchObject({
      constant: 15.0,
      clear: 1, // Player 1's best is CLEAR
      fc: 1,    // Player 2's best is FC
      failed: 0, // Should NOT count Player 2's FAILED score since FC > FAILED
      total: 2
    });
  });
});

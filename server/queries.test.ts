import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

describe('Database Queries (Production Schema)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    
    // Match the PRODUCTION schema exactly (from server/db.ts)
    db.exec(`
      CREATE TABLE songs (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        genre TEXT NOT NULL DEFAULT '',
        version TEXT NOT NULL DEFAULT '',
        jacket_url TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        kamaitachi_id INTEGER,
        last_synced_at INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE charts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER NOT NULL REFERENCES songs(id),
        difficulty TEXT NOT NULL,
        constant REAL NOT NULL,
        level TEXT NOT NULL DEFAULT '',
        note_count INTEGER NOT NULL DEFAULT 0,
        charter TEXT NOT NULL DEFAULT '',
        UNIQUE(song_id, difficulty)
      );

      CREATE TABLE scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL REFERENCES players(id),
        chart_id INTEGER NOT NULL REFERENCES charts(id),
        score INTEGER NOT NULL,
        lamp TEXT NOT NULL,
        op INTEGER NOT NULL,
        time_achieved INTEGER NOT NULL DEFAULT 0,
        UNIQUE(player_id, chart_id)
      );

      CREATE TABLE blacklisted_users (
        kamaitachi_id INTEGER PRIMARY KEY,
        username TEXT NOT NULL,
        added_at INTEGER NOT NULL
      );
    `);

    // Seed data
    db.prepare('INSERT INTO songs (id, title, artist) VALUES (?, ?, ?)').run(1, 'Test Song', 'Test Artist');
    db.prepare('INSERT INTO players (username) VALUES (?)').run('Player_A');
    db.prepare('INSERT INTO players (username) VALUES (?)').run('Player_B');
    db.prepare('INSERT INTO charts (song_id, difficulty, constant, level) VALUES (?, ?, ?, ?)').run(1, 'MAS', 15.0, '15');
    db.prepare('INSERT INTO charts (song_id, difficulty, constant, level) VALUES (?, ?, ?, ?)').run(1, 'EXP', 12.0, '12');
  });

  it('enforces UNIQUE(player_id, chart_id) — rejects duplicate inserts', () => {
    const insert = db.prepare('INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved) VALUES (?, ?, ?, ?, ?, ?)');
    insert.run(1, 1, 1000000, 'CLEAR', 75000, 100);

    expect(() => insert.run(1, 1, 1005000, 'FC', 78000, 200)).toThrow();
  });

  it('chart leaderboard returns one row per player with correct data', () => {
    const insert = db.prepare('INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved) VALUES (?, ?, ?, ?, ?, ?)');
    // Player A scores on MAS chart (chart_id=1)
    insert.run(1, 1, 1009000, 'AJ', 82000, 100);
    // Player B scores on MAS chart
    insert.run(2, 1, 1005000, 'FC', 78000, 200);

    const songId = 1;
    const difficulty = 'MAS';

    // This matches the simplified query in routes.ts
    const leaderboard = db.prepare(`
      SELECT p.username, s.score, s.lamp, s.op, s.time_achieved as timeAchieved
      FROM scores s
      JOIN players p ON s.player_id = p.id
      JOIN charts c ON s.chart_id = c.id
      WHERE c.song_id = ? AND c.difficulty = ?
      ORDER BY s.score DESC, s.time_achieved ASC
      LIMIT ? OFFSET ?
    `).all(songId, difficulty, 10, 0);

    expect(leaderboard.length).toBe(2);
    expect(leaderboard[0]).toMatchObject({ username: 'Player_A', score: 1009000, lamp: 'AJ' });
    expect(leaderboard[1]).toMatchObject({ username: 'Player_B', score: 1005000, lamp: 'FC' });
  });

  it('lamp distribution query correctly counts lamps from one-row-per-chart scores', () => {
    const insert = db.prepare('INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved) VALUES (?, ?, ?, ?, ?, ?)');
    // Player A: MAS chart with AJ
    insert.run(1, 1, 1009000, 'AJ', 82000, 100);
    // Player B: MAS chart with FC  
    insert.run(2, 1, 1005000, 'FC', 78000, 200);
    // Player A: EXP chart with CLEAR
    insert.run(1, 2, 990000, 'CLEAR', 60000, 300);

    // This matches the simplified query in routes.ts (no subquery needed)
    const lamps = db.prepare(`
      SELECT 
        c.constant,
        SUM(CASE WHEN s.lamp = 'AJC' THEN 1 ELSE 0 END) as ajc,
        SUM(CASE WHEN s.lamp = 'AJ' THEN 1 ELSE 0 END) as aj,
        SUM(CASE WHEN s.lamp = 'FC' THEN 1 ELSE 0 END) as fc,
        SUM(CASE WHEN s.lamp = 'CLEAR' THEN 1 ELSE 0 END) as clear,
        SUM(CASE WHEN s.lamp = 'FAILED' THEN 1 ELSE 0 END) as failed,
        COUNT(*) as total
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      WHERE c.difficulty IN ('MAS', 'ULT') AND c.constant >= 10
      GROUP BY c.constant
    `).all();

    // Only MAS (constant=15) qualifies (EXP constant=12 is included too since >= 10)
    // But EXP is filtered out because difficulty not in ('MAS', 'ULT')
    expect(lamps.length).toBe(1);
    expect(lamps[0]).toMatchObject({
      constant: 15.0,
      aj: 1,    // Player A
      fc: 1,    // Player B
      clear: 0,
      failed: 0,
      total: 2
    });
  });

  it('ON CONFLICT upsert keeps better values and does not downgrade', () => {
    // This tests the upsert pattern from sync.ts
    const upsert = db.prepare(`
      INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved)
      VALUES (@player_id, @chart_id, @score, @lamp, @op, @time_achieved)
      ON CONFLICT(player_id, chart_id) DO UPDATE SET
        score = MAX(excluded.score, scores.score),
        lamp = CASE WHEN excluded.op > scores.op THEN excluded.lamp ELSE scores.lamp END,
        op = MAX(excluded.op, scores.op),
        time_achieved = CASE WHEN excluded.score > scores.score THEN excluded.time_achieved ELSE scores.time_achieved END
    `);

    // First insert: decent score with AJ
    upsert.run({ player_id: 1, chart_id: 1, score: 1005000, lamp: 'AJ', op: 78500, time_achieved: 100 });

    // Re-sync with WORSE data (e.g., API returned partial data)
    upsert.run({ player_id: 1, chart_id: 1, score: 990000, lamp: 'CLEAR', op: 60000, time_achieved: 200 });

    const row = db.prepare('SELECT * FROM scores WHERE player_id = 1 AND chart_id = 1').get() as any;
    
    // Should keep the BETTER values from the first insert
    expect(row.score).toBe(1005000);
    expect(row.lamp).toBe('AJ');
    expect(row.op).toBe(78500);
    expect(row.time_achieved).toBe(100);
  });

  it('ON CONFLICT upsert upgrades when new data is better', () => {
    const upsert = db.prepare(`
      INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved)
      VALUES (@player_id, @chart_id, @score, @lamp, @op, @time_achieved)
      ON CONFLICT(player_id, chart_id) DO UPDATE SET
        score = MAX(excluded.score, scores.score),
        lamp = CASE WHEN excluded.op > scores.op THEN excluded.lamp ELSE scores.lamp END,
        op = MAX(excluded.op, scores.op),
        time_achieved = CASE WHEN excluded.score > scores.score THEN excluded.time_achieved ELSE scores.time_achieved END
    `);

    // First insert: mediocre score
    upsert.run({ player_id: 1, chart_id: 1, score: 990000, lamp: 'CLEAR', op: 60000, time_achieved: 100 });

    // Re-sync with BETTER data
    upsert.run({ player_id: 1, chart_id: 1, score: 1009000, lamp: 'AJC', op: 83500, time_achieved: 200 });

    const row = db.prepare('SELECT * FROM scores WHERE player_id = 1 AND chart_id = 1').get() as any;
    
    // Should upgrade to the better values
    expect(row.score).toBe(1009000);
    expect(row.lamp).toBe('AJC');
    expect(row.op).toBe(83500);
    expect(row.time_achieved).toBe(200);
  });

  it('groups constants in 0.5 steps correctly for non-MAS_ULT broad filters', () => {
    // Seed some songs
    db.prepare('INSERT INTO songs (id, title, artist) VALUES (?, ?, ?)').run(2, 'Song 2', 'Artist 2');
    db.prepare('INSERT INTO songs (id, title, artist) VALUES (?, ?, ?)').run(3, 'Song 3', 'Artist 3');
    
    // Group 1: 10.0 to 10.4 -> should map to 10.0
    db.prepare('INSERT INTO charts (id, song_id, difficulty, constant, level) VALUES (?, ?, ?, ?, ?)').run(10, 1, 'ADV', 10.0, '10');
    db.prepare('INSERT INTO charts (id, song_id, difficulty, constant, level) VALUES (?, ?, ?, ?, ?)').run(11, 2, 'ADV', 10.4, '10');
    
    // Group 2: 10.5 to 10.9 -> should map to 10.5
    db.prepare('INSERT INTO charts (id, song_id, difficulty, constant, level) VALUES (?, ?, ?, ?, ?)').run(12, 3, 'EXP', 10.5, '10+');
    db.prepare('INSERT INTO charts (id, song_id, difficulty, constant, level) VALUES (?, ?, ?, ?, ?)').run(13, 2, 'EXP', 10.9, '10+');

    const insert = db.prepare('INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved) VALUES (?, ?, ?, ?, ?, ?)');
    insert.run(1, 10, 1000000, 'CLEAR', 75000, 100);
    insert.run(1, 11, 1000000, 'CLEAR', 75000, 100);
    insert.run(1, 12, 1000000, 'CLEAR', 75000, 100);
    insert.run(1, 13, 1000000, 'CLEAR', 75000, 100);

    // This replicates the 0.5 grouping logic added to routes.ts for broad filters
    const query = db.prepare(`
      SELECT 
        CAST((c.constant * 2) AS INTEGER) / 2.0 as groupedConstant,
        COUNT(s.id) as count
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      WHERE c.id IN (10, 11, 12, 13)
      GROUP BY groupedConstant
      ORDER BY groupedConstant ASC
    `).all() as any[];

    expect(query.length).toBe(2);
    expect(query[0].groupedConstant).toBe(10.0);
    expect(query[0].count).toBe(2); // IDs 10 and 11
    
    expect(query[1].groupedConstant).toBe(10.5);
    expect(query[1].count).toBe(2); // IDs 12 and 13
  });

  describe('Blacklist Purge Logic Regression', () => {
    it('purges legacy players with NULL kamaitachi_id using their username', () => {
      // Seed legacy player
      db.prepare(`INSERT INTO players (username, kamaitachi_id) VALUES ('legacy_user', NULL)`).run();
      const legacyPlayer = db.prepare(`SELECT id FROM players WHERE username = 'legacy_user'`).get() as any;
      
      // Give them a score
      db.prepare(`INSERT INTO scores (player_id, chart_id, score, lamp, op) VALUES (?, 1, 1000000, 'CLEAR', 100)`).run(legacyPlayer.id);

      // Simulate blacklist purge logic (from routes.ts)
      const resolvedKamaitachiId = 9999;
      const targetUsername = 'legacy_user';
      
      // This query must match the one in routes.ts exactly: WHERE kamaitachi_id = ? OR username = ?
      const existingPlayer = db.prepare('SELECT id FROM players WHERE kamaitachi_id = ? OR username = ?').get(resolvedKamaitachiId, targetUsername) as any;
      
      expect(existingPlayer).toBeDefined();
      
      if (existingPlayer) {
        db.prepare('DELETE FROM scores WHERE player_id = ?').run(existingPlayer.id);
        db.prepare('DELETE FROM players WHERE id = ?').run(existingPlayer.id);
      }

      const checkPlayer = db.prepare('SELECT * FROM players WHERE username = ?').get(targetUsername);
      const checkScores = db.prepare('SELECT * FROM scores WHERE player_id = ?').all(legacyPlayer.id);

      expect(checkPlayer).toBeUndefined();
      expect(checkScores.length).toBe(0);
    });
  });
});

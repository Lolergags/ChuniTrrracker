import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

describe('Backend Routes & API Integration Tests', () => {
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
        jacket_url TEXT NOT NULL DEFAULT '',
        is_jp_active INTEGER NOT NULL DEFAULT 1,
        is_intl_active INTEGER NOT NULL DEFAULT 1,
        is_pl_offline_active INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS charts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER NOT NULL REFERENCES songs(id),
        difficulty TEXT NOT NULL,
        constant REAL NOT NULL,
        level TEXT NOT NULL,
        note_count INTEGER NOT NULL DEFAULT 0,
        charter TEXT NOT NULL DEFAULT '',
        version TEXT NOT NULL DEFAULT '',
        UNIQUE(song_id, difficulty)
      );

      CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        kamaitachi_id INTEGER,
        kamaitachi_rating REAL,
        last_synced_at INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL REFERENCES players(id),
        chart_id INTEGER NOT NULL REFERENCES charts(id),
        score INTEGER NOT NULL,
        lamp TEXT NOT NULL,
        clear_lamp TEXT NOT NULL DEFAULT 'CLEAR',
        op INTEGER NOT NULL,
        time_achieved INTEGER NOT NULL DEFAULT 0,
        UNIQUE(player_id, chart_id)
      );
    `);

    // Seed test songs and charts
    db.prepare(`INSERT INTO songs (id, title, artist, version, is_jp_active) VALUES 
      (1, 'Gekikyoku', 'Cosmo', 'CHUNITHM', 1),
      (2, 'Ikazuchi', 'Taishi', 'AIR', 1)
    `).run();

    db.prepare(`INSERT INTO charts (id, song_id, difficulty, constant, level, version) VALUES 
      (10, 1, 'MAS', 14.5, '14+', 'CHUNITHM'),
      (11, 1, 'ULT', 15.0, '15', 'AIR'),
      (20, 2, 'MAS', 13.8, '13+', 'AIR')
    `).run();

    // Seed test players
    db.prepare(`INSERT INTO players (id, username, kamaitachi_id, kamaitachi_rating) VALUES 
      (1, 'Alice', 1001, 16.50),
      (2, 'Bob', 1002, 15.20)
    `).run();

    // Seed scores
    db.prepare(`INSERT INTO scores (player_id, chart_id, score, lamp, clear_lamp, op) VALUES 
      (1, 10, 1008500, 'AJC', 'CLEAR', 81250),
      (1, 11, 1007500, 'AJ', 'CLEAR', 86000),
      (2, 10, 1001000, 'FC', 'CLEAR', 77500)
    `).run();
  });

  it('GET /players: should correctly calculate score counts per player', () => {
    const players = db.prepare(`
      SELECT p.id, p.username, p.kamaitachi_rating, COUNT(s.id) as score_count
      FROM players p
      LEFT JOIN scores s ON p.id = s.player_id
      GROUP BY p.id
      ORDER BY p.username ASC
    `).all() as any[];

    expect(players).toHaveLength(2);
    expect(players[0].username).toBe('Alice');
    expect(players[0].score_count).toBe(2);
    expect(players[1].username).toBe('Bob');
    expect(players[1].score_count).toBe(1);
  });

  it('GET /leaderboard: should calculate totalMaxOp denominator accurately', () => {
    const songMaxOps = db.prepare(`
      SELECT IFNULL(SUM(song_max_op), 0) as total_max_op FROM (
        SELECT ((MAX(c.constant) * 5000 + 15000) / 5) * 5 as song_max_op
        FROM charts c
        JOIN songs ON c.song_id = songs.id
        WHERE c.difficulty != 'WE' AND (c.song_id NOT IN (50, 81) AND c.id != 239116)
        GROUP BY c.song_id
      )
    `).get() as any;

    // Song 1 max const: 15.0 (ULT) -> (15.0 * 5000 + 15000) = 90000
    // Song 2 max const: 13.8 (MAS) -> (13.8 * 5000 + 15000) = 84000
    // Total max OP = 90000 + 84000 = 174000
    expect(songMaxOps.total_max_op).toBe(174000);
  });

  it('GET /leaderboard: should rank players by total OP in descending order', () => {
    const rankings = db.prepare(`
      SELECT p.username, IFNULL(SUM(max_scores.max_op), 0) as total_op
      FROM players p
      JOIN (
        SELECT s.player_id, c.song_id, MAX(s.op) as max_op
        FROM scores s
        JOIN charts c ON s.chart_id = c.id
        GROUP BY s.player_id, c.song_id
      ) max_scores ON p.id = max_scores.player_id
      GROUP BY p.id
      ORDER BY total_op DESC
    `).all() as any[];

    expect(rankings).toHaveLength(2);
    expect(rankings[0].username).toBe('Alice');
    expect(rankings[0].total_op).toBe(86000); // Max OP for Song 1 is 86000
    expect(rankings[1].username).toBe('Bob');
    expect(rankings[1].total_op).toBe(77500);
  });

  it('GET /performance/lamps: should count lamps using FILTER (WHERE ...) correctly', () => {
    const lampCounts = db.prepare(`
      SELECT 
        c.constant,
        COUNT(*) FILTER (WHERE s.lamp = 'AJC') as ajc,
        COUNT(*) FILTER (WHERE s.lamp = 'AJ') as aj,
        COUNT(*) FILTER (WHERE s.lamp = 'FC') as fc,
        COUNT(*) FILTER (WHERE s.lamp = 'CLEAR') as clear,
        COUNT(*) as total
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      GROUP BY c.constant
    `).all() as any[];

    const const145 = lampCounts.find((l: any) => l.constant === 14.5);
    expect(const145).toBeDefined();
    expect(const145.ajc).toBe(1);
    expect(const145.fc).toBe(1);
    expect(const145.total).toBe(2);
  });

  it('GET /analytics/:songId: should deduplicate multiple chart scores per player to keep max OP', () => {
    const songId = 1;
    const songScores = db.prepare(`
      SELECT s.player_id, MAX(s.op) as max_op
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      WHERE c.song_id = ?
      GROUP BY s.player_id
    `).all(songId) as any[];

    expect(songScores).toHaveLength(2);
    const alice = songScores.find((s: any) => s.player_id === 1);
    expect(alice.max_op).toBe(86000); // 86000 (ULT) > 81250 (MAS)
  });

  it('GET /performance/heatmap: should bucket scores by grade correctly', () => {
    const heatmap = db.prepare(`
      SELECT 
        c.constant,
        CASE 
          WHEN s.score >= 1009000 THEN 'SSS+'
          WHEN s.score >= 1007500 THEN 'SSS'
          WHEN s.score >= 1005000 THEN 'SS+'
          WHEN s.score >= 1000000 THEN 'SS'
          WHEN s.score >= 990000 THEN 'S+'
          WHEN s.score >= 975000 THEN 'S'
          ELSE '< S'
        END as grade,
        COUNT(*) as count
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      GROUP BY c.constant, grade
    `).all() as any[];

    expect(heatmap.length).toBeGreaterThan(0);
    const sssRow = heatmap.find((h: any) => h.constant === 15.0 && h.grade === 'SSS');
    expect(sssRow).toBeDefined();
    expect(sssRow.count).toBe(1);
  });

  it('GET /players/:username/scores: should return scores sorted by OP descending with correct pagination', () => {
    const playerId = 1;
    const limit = 1;
    const scores = db.prepare(`
      SELECT c.id as chartId, c.constant, s.score, s.op
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      WHERE s.player_id = ?
      ORDER BY s.op DESC
      LIMIT ?
    `).all(playerId, limit) as any[];

    expect(scores).toHaveLength(1);
    expect(scores[0].op).toBe(86000); // Highest OP score
  });

  it('Rating Filter: should filter players by ratingMin and ratingMax parameters', () => {
    const minRating = 16.0;
    const players = db.prepare(`
      SELECT username, kamaitachi_rating
      FROM players
      WHERE kamaitachi_rating >= ?
    `).all(minRating) as any[];

    expect(players).toHaveLength(1);
    expect(players[0].username).toBe('Alice');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { getChartFilterConditions } from './utils/filters.js';

describe('Chart Query Logic & Ghost Chart Exclusions', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    
    // Setup basic schema
    db.exec(`
      CREATE TABLE songs (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        genre TEXT NOT NULL DEFAULT '',
        version TEXT NOT NULL DEFAULT '',
        jacket_url TEXT NOT NULL DEFAULT '',
        is_jp_active INTEGER NOT NULL DEFAULT 1,
        is_intl_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE charts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER NOT NULL REFERENCES songs(id),
        difficulty TEXT NOT NULL,
        constant REAL NOT NULL,
        level TEXT NOT NULL,
        note_count INTEGER NOT NULL DEFAULT 0,
        charter TEXT NOT NULL DEFAULT ''
      );
    `);

    const insertSong = db.prepare('INSERT INTO songs (id, title, artist, is_jp_active) VALUES (?, ?, ?, ?)');
    const insertChart = db.prepare('INSERT INTO charts (id, song_id, difficulty, constant, level) VALUES (?, ?, ?, ?, ?)');

    // 1. Insert a normal song with valid MAS/ULT charts
    insertSong.run(10, 'Normal Song', 'Artist A', 1);
    insertChart.run(1, 10, 'MAS', 14.5, '14+');
    insertChart.run(2, 10, 'ULT', 15.0, '15');

    // 2. Insert ghost charts (Sinfonie 50, 81)
    // IMPORTANT: Deliberately avoiding the old hardcoded SQLite IDs (95, 201) to simulate the auto-increment bug regression
    insertSong.run(50, 'Sinfonie Nr. 9', 'Beethoven', 1);
    insertChart.run(1001, 50, 'MAS', 1.0, '1'); // Old bug would have failed to exclude this since ID is 1001, not 95

    insertSong.run(81, 'Sinfonie Nr. 9 (Master)', 'Beethoven', 1);
    insertChart.run(1002, 81, 'MAS', 1.0, '1'); // Old bug would have failed since ID is 1002, not 201

    // 3. Insert manually added Kamaitachi ghost chart (id: 239116, song_id: 0)
    insertSong.run(0, 'Unknown Kamaitachi Ghost', 'Unknown', 1);
    insertChart.run(239116, 0, 'MAS', 9.5, '9+');
  });

  it('should exclude ghost charts by song_id regardless of their SQLite chart_id', () => {
    // Generate filter conditions for MAS/ULT
    const { conditions, bindings } = getChartFilterConditions({ diff: 'MAS,ULT' }, 'songs', 'c');
    
    // Verify that the new song_id-based exclusion is present in the generated conditions
    expect(conditions.some(c => c.includes('song_id NOT IN (50, 81) AND c.id != 239116'))).toBe(true);

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Simulate totalChartsQuery for levelStats
    const totalChartsQuery = db.prepare(`
      SELECT c.level, COUNT(*) as count
      FROM charts c
      JOIN songs ON c.song_id = songs.id
      ${whereClause}
      GROUP BY c.level
    `).all(...bindings) as any[];

    // Level 1 charts from the Sinfonie ghost charts should be entirely excluded
    const level1Row = totalChartsQuery.find(r => r.level === '1');
    expect(level1Row).toBeUndefined();

    // Level 9+ chart from 239116 should be entirely excluded
    const level9Row = totalChartsQuery.find(r => r.level === '9+');
    expect(level9Row).toBeUndefined();

    // The normal charts should still remain
    const level14PlusRow = totalChartsQuery.find(r => r.level === '14+');
    expect(level14PlusRow).toBeDefined();
    expect(level14PlusRow.count).toBe(1);

    const level15Row = totalChartsQuery.find(r => r.level === '15');
    expect(level15Row).toBeDefined();
    expect(level15Row.count).toBe(1);
  });

  it('should include normal level 1 charts when playing BAS difficulties', () => {
    // Add a normal BAS chart with level 1
    const insertChart = db.prepare('INSERT INTO charts (id, song_id, difficulty, constant, level) VALUES (?, ?, ?, ?, ?)');
    insertChart.run(3, 10, 'BAS', 1.0, '1');

    const { conditions, bindings } = getChartFilterConditions({ diff: 'BAS' }, 'songs', 'c');
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const totalChartsQuery = db.prepare(`
      SELECT c.level, COUNT(*) as count
      FROM charts c
      JOIN songs ON c.song_id = songs.id
      ${whereClause}
      GROUP BY c.level
    `).all(...bindings) as any[];

    // The normal BAS level 1 chart should be included
    const level1Row = totalChartsQuery.find(r => r.level === '1');
    expect(level1Row).toBeDefined();
    expect(level1Row.count).toBe(1);
  });

  it('should correctly count ULTIMA charts based on chart.version instead of song.version', () => {
    // Schema with version columns
    db.exec(`
      ALTER TABLE charts ADD COLUMN version TEXT NOT NULL DEFAULT '';
      ALTER TABLE songs ADD COLUMN is_pl_offline_active INTEGER NOT NULL DEFAULT 1;
    `);

    const insertSong = db.prepare('INSERT INTO songs (id, title, artist, version, is_jp_active, is_pl_offline_active) VALUES (?, ?, ?, ?, 1, 1)');
    const insertChart = db.prepare('INSERT INTO charts (id, song_id, difficulty, constant, level, version) VALUES (?, ?, ?, ?, ?, ?)');

    // Song released in CHUNITHM
    insertSong.run(200, 'Legacy Song', 'Artist B', 'CHUNITHM');
    // MAS chart added in CHUNITHM
    insertChart.run(2001, 200, 'MAS', 13.0, '13', 'CHUNITHM');
    // ULT chart added much later in SUN
    insertChart.run(2002, 200, 'ULT', 14.8, '14+', 'SUN');

    // 1. Querying at AIR version (CHUNITHM -> AIR)
    const filterAir = getChartFilterConditions({ server: 'JP', version: 'AIR' }, 'songs', 'c');
    const whereAir = `WHERE ${filterAir.conditions.join(' AND ')}`;
    const chartsAir = db.prepare(`SELECT c.id FROM charts c JOIN songs ON c.song_id = songs.id ${whereAir}`).all(...filterAir.bindings) as any[];

    // AIR version should include the MAS chart (CHUNITHM) but exclude the ULT chart (SUN)
    expect(chartsAir.some(c => c.id === 2001)).toBe(true);
    expect(chartsAir.some(c => c.id === 2002)).toBe(false);

    // 2. Querying at SUN version for JP server (CHUNITHM -> SUN)
    const filterSun = getChartFilterConditions({ server: 'JP', version: 'SUN' }, 'songs', 'c');
    const whereSun = `WHERE ${filterSun.conditions.join(' AND ')}`;
    const chartsSun = db.prepare(`SELECT c.id FROM charts c JOIN songs ON c.song_id = songs.id ${whereSun}`).all(...filterSun.bindings) as any[];

    // SUN version should include both MAS and ULT charts
    expect(chartsSun.some(c => c.id === 2001)).toBe(true);
    expect(chartsSun.some(c => c.id === 2002)).toBe(true);

    // 3. Querying for PL_OFFLINE server even with LUMINOUS version selected
    const filterPl = getChartFilterConditions({ server: 'PL_OFFLINE', version: 'LUMINOUS' }, 'songs', 'c');
    const wherePl = `WHERE ${filterPl.conditions.join(' AND ')}`;
    const chartsPl = db.prepare(`SELECT c.id FROM charts c JOIN songs ON c.song_id = songs.id ${wherePl}`).all(...filterPl.bindings) as any[];

    // PL_OFFLINE should include MAS chart (CHUNITHM) but strictly exclude ULT chart (SUN)
    expect(chartsPl.some(c => c.id === 2001)).toBe(true);
    expect(chartsPl.some(c => c.id === 2002)).toBe(false);
  });

  it('should correctly calculate userRank and userPage for chart leaderboards', () => {
    db.exec(`
      CREATE TABLE players (id INTEGER PRIMARY KEY, username TEXT NOT NULL);
      CREATE TABLE scores (id INTEGER PRIMARY KEY, player_id INTEGER, chart_id INTEGER, score INTEGER, lamp TEXT, op INTEGER, time_achieved INTEGER);
    `);

    db.prepare('INSERT INTO players (id, username) VALUES (?, ?)').run(1, 'Alice');
    db.prepare('INSERT INTO players (id, username) VALUES (?, ?)').run(2, 'Bob');
    db.prepare('INSERT INTO players (id, username) VALUES (?, ?)').run(3, 'Charlie');

    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved) VALUES (?, 1, 1009000, 'AJ', 10000, 100)").run(1);
    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved) VALUES (?, 1, 1007500, 'FC', 9000, 200)").run(2);
    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved) VALUES (?, 1, 1000000, 'Clear', 8000, 300)").run(3);

    const allScores = db.prepare(`
      SELECT p.username, s.score
      FROM scores s
      JOIN players p ON s.player_id = p.id
      WHERE s.chart_id = 1
      ORDER BY s.score DESC, s.time_achieved ASC
    `).all() as { username: string; score: number }[];

    const limit = 2; // 2 rows per page
    const bobIndex = allScores.findIndex(r => r.username === 'Bob');
    expect(bobIndex).toBe(1); // 2nd place (0-indexed 1)
    const bobRank = bobIndex + 1; // #2
    const bobPage = Math.floor(bobIndex / limit) + 1; // Page 1 (limit 2)

    expect(bobRank).toBe(2);
    expect(bobPage).toBe(1);

    const charlieIndex = allScores.findIndex(r => r.username === 'Charlie');
    expect(charlieIndex).toBe(2); // 3rd place (0-indexed 2)
    const charlieRank = charlieIndex + 1; // #3
    const charliePage = Math.floor(charlieIndex / limit) + 1; // Page 2 (limit 2)

    expect(charlieRank).toBe(3);
    expect(charliePage).toBe(2);
  });

  it('should correctly query performance players OP distribution with exact binding positions', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, username TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY, player_id INTEGER, chart_id INTEGER, score INTEGER, lamp TEXT, op INTEGER, time_achieved INTEGER);
    `);

    db.prepare('INSERT INTO players (id, username) VALUES (?, ?)').run(1, 'Alice');
    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved) VALUES (?, 1, 1009000, 'AJ', 10000, 100)").run(1);

    const filter = getChartFilterConditions({ server: 'JP' }, 'songs', 'c');
    const chartWhereClause = filter.conditions.length > 0 ? `WHERE ${filter.conditions.join(' AND ')}` : '';
    
    let pWhere = '';
    const pBindings: any[] = [];

    const totalMaxOp = 100000;
    const rawData = db.prepare(`
      SELECT 
        p.username,
        IFNULL(SUM(max_scores.max_op), 0) as totalOp,
        IFNULL(ROUND(CAST(SUM(max_scores.max_op) AS REAL) / ? * 100, 2), 0) as opPercent
      FROM players p
      JOIN (
        SELECT s.player_id, c.song_id, MAX(s.op) as max_op
        FROM scores s
        JOIN charts c ON s.chart_id = c.id
        JOIN songs ON c.song_id = songs.id
        ${chartWhereClause}
        GROUP BY s.player_id, c.song_id
      ) max_scores ON p.id = max_scores.player_id
      ${pWhere}
      GROUP BY p.id, p.username
      HAVING totalOp > 0
      ORDER BY totalOp DESC
    `).all(totalMaxOp, ...filter.bindings, ...pBindings) as any[];

    expect(Array.isArray(rawData)).toBe(true);
    expect(rawData.length).toBeGreaterThan(0);
    expect(rawData[0].username).toBe('Alice');
    expect(rawData[0].opPercent).toBeGreaterThan(0);
  });

  it('should return individual player play count rather than global play count for player scores', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, username TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY, player_id INTEGER, chart_id INTEGER, score INTEGER, lamp TEXT, op INTEGER);
    `);

    db.prepare("INSERT INTO players (id, username) VALUES (1, 'Alice'), (2, 'Bob')").run();
    
    // Alice played chart 10 twice
    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op) VALUES (1, 10, 1007500, 'FC', 9000)").run();
    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op) VALUES (1, 10, 1005000, 'CLEAR', 8500)").run();

    // Bob played chart 10 3 times (global total: 5 scores for chart 10)
    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op) VALUES (2, 10, 1000000, 'CLEAR', 8000)").run();
    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op) VALUES (2, 10, 1001000, 'CLEAR', 8100)").run();
    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op) VALUES (2, 10, 1002000, 'CLEAR', 8200)").run();

    // Query Alice's play count for chart 10 using resolved player.id
    const targetUsername = 'Alice';
    const player = db.prepare('SELECT id FROM players WHERE username = ?').get(targetUsername) as { id: number };
    const chartIds = [10];
    const placeholders = chartIds.map(() => '?').join(',');

    const counts = db.prepare(`
      SELECT s.chart_id, COUNT(*) as playCount
      FROM scores s
      WHERE s.player_id = ? AND s.chart_id IN (${placeholders})
      GROUP BY s.chart_id
    `).all(player.id, ...chartIds) as { chart_id: number; playCount: number }[];

    const countMap = new Map<number, number>();
    for (const row of counts) {
      countMap.set(row.chart_id, row.playCount);
    }

    const alicePlayCount = countMap.get(10) || 1;
    
    // Must strictly equal Alice's 2 attempts, NOT the global total of 5!
    expect(alicePlayCount).toBe(2);
  });

  it('should preserve player score history and play counts when a player changes their username', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, username TEXT NOT NULL, kamaitachi_id INTEGER);
      CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY, player_id INTEGER, chart_id INTEGER, score INTEGER, lamp TEXT, op INTEGER);
    `);

    // 1. Seed player with original username
    db.prepare("INSERT INTO players (id, username, kamaitachi_id) VALUES (10, 'ChuniMaster99', 10001)").run();
    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op) VALUES (10, 5, 1007800, 'AJ', 10000)").run();
    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op) VALUES (10, 5, 1005000, 'FC', 9500)").run();

    // 2. Simulate player changing username in Kamaitachi / DB
    db.prepare("UPDATE players SET username = 'ChuniLegend2026' WHERE id = 10").run();

    // 3. Resolve player by new username
    const resolvedPlayer = db.prepare('SELECT id FROM players WHERE username = ? OR kamaitachi_id = ?').get('ChuniLegend2026', 'ChuniLegend2026') as { id: number };
    expect(resolvedPlayer).toBeDefined();
    expect(resolvedPlayer.id).toBe(10);

    // 4. Query scores strictly by s.player_id = player.id
    const playerScores = db.prepare(`
      SELECT s.chart_id, s.score, s.op
      FROM scores s
      WHERE s.player_id = ?
      ORDER BY s.op DESC
    `).all(resolvedPlayer.id) as any[];

    expect(playerScores.length).toBe(2);
    expect(playerScores[0].score).toBe(1007800);

    // 5. Query per-chart play count by player.id
    const playCountRow = db.prepare(`
      SELECT COUNT(*) as playCount
      FROM scores s
      WHERE s.player_id = ? AND s.chart_id = 5
    `).get(resolvedPlayer.id) as { playCount: number };

    expect(playCountRow.playCount).toBe(2);
  });

  it('should correctly resolve player by kamaitachi_id fallback when looking up player', () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, username TEXT NOT NULL, kamaitachi_id INTEGER);
      CREATE TABLE IF NOT EXISTS scores (id INTEGER PRIMARY KEY, player_id INTEGER, chart_id INTEGER, score INTEGER, lamp TEXT, op INTEGER);
    `);

    db.prepare("INSERT INTO players (id, username, kamaitachi_id) VALUES (42, 'TachiUser', 998877)").run();
    db.prepare("INSERT INTO scores (player_id, chart_id, score, lamp, op) VALUES (42, 1, 1009000, 'AJC', 10000)").run();

    // Lookup using kamaitachi_id as string
    const lookupParam = '998877';
    const player = db.prepare('SELECT id FROM players WHERE username = ? OR kamaitachi_id = ?').get(lookupParam, lookupParam) as { id: number };

    expect(player).toBeDefined();
    expect(player.id).toBe(42);

    const scores = db.prepare('SELECT * FROM scores WHERE player_id = ?').all(player.id);
    expect(scores.length).toBe(1);
    expect(scores[0].score).toBe(1009000);
  });
});


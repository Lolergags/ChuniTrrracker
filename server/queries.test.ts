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
});

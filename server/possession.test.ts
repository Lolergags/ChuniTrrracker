import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

describe('Possession & Per-Chart Versioning Logic', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE songs (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        version TEXT NOT NULL,
        is_jp_active INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE charts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER NOT NULL REFERENCES songs(id),
        difficulty TEXT NOT NULL,
        constant REAL NOT NULL,
        version TEXT NOT NULL,
        UNIQUE(song_id, difficulty)
      );
      CREATE TABLE players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE
      );
      CREATE TABLE scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL REFERENCES players(id),
        chart_id INTEGER NOT NULL REFERENCES charts(id),
        score INTEGER NOT NULL,
        op INTEGER NOT NULL,
        UNIQUE(player_id, chart_id)
      );
    `);
  });

  it('should exclude future ULTIMA charts from past version possession checks', () => {
    // Insert a song released in AIR
    db.prepare(`INSERT INTO songs (id, title, version) VALUES (1, 'Philosopher', 'AIR')`).run();
    // MAS chart added in AIR
    db.prepare(`INSERT INTO charts (id, song_id, difficulty, constant, version) VALUES (1, 1, 'MAS', 14.5, 'AIR')`).run();
    // ULT chart added in X-VERSE-X
    db.prepare(`INSERT INTO charts (id, song_id, difficulty, constant, version) VALUES (2, 1, 'ULT', 15.1, 'X-VERSE-X')`).run();

    // Player SSS score on MAS chart only
    db.prepare(`INSERT INTO players (id, username) VALUES (1, 'TestPlayer')`).run();
    db.prepare(`INSERT INTO scores (player_id, chart_id, score, op) VALUES (1, 1, 1007500, 87500)`).run();

    // Query for AIR version (includedVersions: ['CHUNITHM', 'CHUNITHM PLUS', 'AIR'])
    const airVersions = ['CHUNITHM', 'CHUNITHM PLUS', 'AIR'];
    const placeholdersAir = airVersions.map(() => '?').join(',');

    const masUltAir = (db.prepare(`
      SELECT COUNT(*) as count FROM charts c 
      JOIN songs ON c.song_id = songs.id 
      WHERE c.difficulty IN ('MAS', 'ULT') AND c.version IN (${placeholdersAir})
    `).get(...airVersions) as any).count;

    expect(masUltAir).toBe(1); // Only MAS chart, ULT excluded!

    // Query for X-VERSE-X version
    const allVersions = ['CHUNITHM', 'CHUNITHM PLUS', 'AIR', 'X-VERSE-X'];
    const placeholdersAll = allVersions.map(() => '?').join(',');

    const masUltAll = (db.prepare(`
      SELECT COUNT(*) as count FROM charts c 
      JOIN songs ON c.song_id = songs.id 
      WHERE c.difficulty IN ('MAS', 'ULT') AND c.version IN (${placeholdersAll})
    `).get(...allVersions) as any).count;

    expect(masUltAll).toBe(2); // Both MAS and ULT charts
  });

  it('should grant Rainbow possession on past version when all past Master charts are cleared', () => {
    db.prepare(`INSERT INTO songs (id, title, version) VALUES (1, 'Song 1', 'AIR')`).run();
    db.prepare(`INSERT INTO charts (id, song_id, difficulty, constant, version) VALUES (1, 1, 'MAS', 14.5, 'AIR')`).run();
    db.prepare(`INSERT INTO charts (id, song_id, difficulty, constant, version) VALUES (2, 1, 'ULT', 15.1, 'X-VERSE-X')`).run();

    db.prepare(`INSERT INTO players (id, username) VALUES (1, 'TopPlayer')`).run();
    db.prepare(`INSERT INTO scores (player_id, chart_id, score, op) VALUES (1, 1, 1008000, 87500)`).run();

    const airVersions = ['CHUNITHM', 'CHUNITHM PLUS', 'AIR'];
    const placeholdersAir = airVersions.map(() => '?').join(',');

    const masUltTotal = (db.prepare(`
      SELECT COUNT(*) as count FROM charts c 
      JOIN songs ON c.song_id = songs.id 
      WHERE c.difficulty IN ('MAS', 'ULT') AND c.version IN (${placeholdersAir})
    `).get(...airVersions) as any).count;

    const playerScores = db.prepare(`
      SELECT 
        SUM(CASE WHEN s.score >= 1007500 THEN 1 ELSE 0 END) as sss
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      JOIN songs ON c.song_id = songs.id
      WHERE s.player_id = 1 AND c.difficulty IN ('MAS', 'ULT') AND c.version IN (${placeholdersAir})
    `).get(...airVersions) as any;

    expect(masUltTotal).toBe(1);
    expect(playerScores.sss).toBe(1);
    expect(playerScores.sss >= masUltTotal).toBe(true);
  });
});

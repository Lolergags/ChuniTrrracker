import db from './db.js';
import { calculateOp } from '../src/lib/calc/overpower.js';
import type { LampType } from '../src/lib/types/index.js';

// Map Kamaitachi lamps to internal lamps
// Kamaitachi NONE = CLEAR, since it just means cleared without special lamps
const KAMAITACHI_LAMP_MAP: Record<string, LampType> = {
  'NONE': 'CLEAR',
  'CLEAR': 'CLEAR',
  'FULL COMBO': 'FC',
  'ALL JUSTICE': 'AJ',
  'ALL JUSTICE CRITICAL': 'AJC',
};

export async function syncSongs() {
  console.log('Fetching songs from Beerpsi...');
  const res = await fetch('https://chunithm.beerpsi.cc/songs');
  if (!res.ok) throw new Error('Failed to fetch songs from Beerpsi');
  const data = await res.json();

  console.log(`Received ${data.length} songs. Syncing to DB (JP track list)...`);

  const insertSong = db.prepare(`
    INSERT INTO songs (id, title, artist, genre, version, jacket_url)
    VALUES (@id, @title, @artist, @genre, @version, @jacket_url)
    ON CONFLICT(id) DO UPDATE SET
      title=excluded.title,
      artist=excluded.artist,
      genre=excluded.genre,
      version=excluded.version,
      jacket_url=excluded.jacket_url
  `);

  const insertChart = db.prepare(`
    INSERT INTO charts (song_id, difficulty, constant, level, note_count, charter)
    VALUES (@song_id, @difficulty, @constant, @level, @note_count, @charter)
    ON CONFLICT(song_id, difficulty) DO UPDATE SET
      constant=excluded.constant,
      level=excluded.level,
      note_count=excluded.note_count,
      charter=excluded.charter
  `);

  let songCount = 0;
  let chartCount = 0;

  const transaction = db.transaction((songs: any[]) => {
    for (const song of songs) {
      // Filter for JP availability
      if (!song.availability || !song.availability.jp) continue;

      insertSong.run({
        id: song.id,
        title: song.title,
        artist: song.artist,
        genre: song.genre,
        version: song.version,
        jacket_url: song.jacket_url || ''
      });
      songCount++;

      for (const chart of song.charts) {
        // Exclude WE (World's End)
        if (chart.difficulty === 'WE') continue;

        insertChart.run({
          song_id: song.id,
          difficulty: chart.difficulty,
          constant: chart.const,
          level: chart.level,
          note_count: chart.notecounts?.total || 0,
          charter: chart.charter || ''
        });
        chartCount++;
      }
    }
  });

  transaction(data);
  console.log(`Synced ${songCount} songs and ${chartCount} charts.`);
  return { songCount, chartCount };
}

export async function syncPlayer(username: string) {
  console.log(`Syncing player: ${username}`);

  // Fetch or create player
  const insertPlayer = db.prepare(`
    INSERT INTO players (username, last_synced_at)
    VALUES (@username, @now)
    ON CONFLICT(username) DO UPDATE SET last_synced_at=@now
  `);
  
  insertPlayer.run({ username, now: Date.now() });
  const player = db.prepare(`SELECT id FROM players WHERE username = ?`).get(username) as { id: number };

  // Fetch scores (using Mock for now, since Kamaitachi v1 scores/all is returning 404)
  const scoresData = await fetchMockScores(username);

  const insertScore = db.prepare(`
    INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved)
    VALUES (@player_id, @chart_id, @score, @lamp, @op, @time_achieved)
    ON CONFLICT(player_id, chart_id, score, lamp) DO NOTHING
  `);

  const getChart = db.prepare(`SELECT id, constant FROM charts WHERE song_id = ? AND difficulty = ?`);

  let scoreCount = 0;
  const transaction = db.transaction((scores: any[]) => {
    for (const score of scores) {
      const chart = getChart.get(score.songId, score.chartType) as { id: number, constant: number } | undefined;
      if (!chart) continue; // Chart not found (e.g., filtered out or not JP)

      const lamp = KAMAITACHI_LAMP_MAP[score.lamp] || 'FAILED';
      const op = calculateOp(score.score, chart.constant, lamp);

      const result = insertScore.run({
        player_id: player.id,
        chart_id: chart.id,
        score: score.score,
        lamp: lamp,
        op: op,
        time_achieved: score.timeAchieved || Date.now()
      });

      if (result.changes > 0) scoreCount++;
    }
  });

  transaction(scoresData);
  console.log(`Synced ${scoreCount} new scores for ${username}`);
  return { scoreCount };
}

// Generates pseudo-random deterministic scores based on username (for testing)
async function fetchMockScores(username: string) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Get some valid song IDs and difficulties from our DB so the foreign keys actually match
  const validCharts = db.prepare(`
    SELECT song_id, difficulty FROM charts 
    WHERE difficulty IN ('EXP', 'MAS', 'ULT')
    ORDER BY random() 
    LIMIT 200
  `).all() as { song_id: number, difficulty: string }[];

  const seed = username.length * 1000;
  const lamps = ['NONE', 'CLEAR', 'FULL COMBO', 'ALL JUSTICE', 'ALL JUSTICE CRITICAL'];

  const scores = validCharts.map((chart, i) => {
    const rawScore = 950000 + ((seed * (i+1)) % 60000); // 950k to 1.01M
    return {
      score: rawScore,
      lamp: lamps[(seed + i) % lamps.length],
      songId: chart.song_id,
      chartType: chart.difficulty,
      timeAchieved: Date.now() - (i * 1000 * 60 * 60) // recent hours
    };
  });

  return scores;
}

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

const LAMP_VALUES: Record<LampType, number> = {
  'FAILED': 0,
  'CLEAR': 1,
  'FC': 2,
  'AJ': 3,
  'AJC': 4
};

const KAMAITACHI_DIFF_MAP: Record<string, string> = {
  'BASIC': 'BAS',
  'ADVANCED': 'ADV',
  'EXPERT': 'EXP',
  'MASTER': 'MAS',
  'ULTIMA': 'ULT'
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

export async function syncPlayer(username: string, apiKey?: string) {
  console.log(`Syncing player: ${username}`);

  let targetUserId = username;
  let headers: Record<string, string> = {};

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    const meRes = await fetch('https://kamai.tachi.ac/api/v1/users/me', { headers });
    if (!meRes.ok) throw new Error('Invalid API Key or unable to authenticate');
    const meData = await meRes.json();
    targetUserId = meData.body.id.toString();
    username = meData.body.username; // Use actual username
  }

  // Fetch or create player (now that we potentially resolved username from API key)
  const insertPlayer = db.prepare(`
    INSERT INTO players (username, kamaitachi_id, last_synced_at)
    VALUES (@username, @kamaitachi_id, @now)
    ON CONFLICT(username) DO UPDATE SET
      kamaitachi_id=COALESCE(excluded.kamaitachi_id, players.kamaitachi_id),
      last_synced_at=@now
  `);
  insertPlayer.run({ username, kamaitachi_id: apiKey ? parseInt(targetUserId) || null : null, now: Date.now() });
  const player = db.prepare(`SELECT id FROM players WHERE username = ?`).get(username) as { id: number };

  const scoresUrl = `https://kamai.tachi.ac/api/v1/users/${encodeURIComponent(targetUserId)}/games/chunithm/Single/scores/all`;
  const scoresRes = await fetch(scoresUrl, { headers });
  if (!scoresRes.ok) throw new Error(`Failed to fetch scores: ${scoresRes.statusText}`);
  const scoresDataJson = await scoresRes.json();
  const rawScores = scoresDataJson.body.scores || [];
  const rawCharts = scoresDataJson.body.charts || [];

  // Create chart lookup map
  const chartInfoMap = new Map<string, string>();
  for (const c of rawCharts) {
    if (KAMAITACHI_DIFF_MAP[c.difficulty]) {
      chartInfoMap.set(c.chartID, KAMAITACHI_DIFF_MAP[c.difficulty]);
    }
  }

  const insertScore = db.prepare(`
    INSERT INTO scores (player_id, chart_id, score, lamp, op, time_achieved)
    VALUES (@player_id, @chart_id, @score, @lamp, @op, @time_achieved)
    ON CONFLICT(player_id, chart_id) DO UPDATE SET
      score = MAX(excluded.score, scores.score),
      lamp = CASE WHEN excluded.op > scores.op THEN excluded.lamp ELSE scores.lamp END,
      op = MAX(excluded.op, scores.op),
      time_achieved = CASE WHEN excluded.score > scores.score THEN excluded.time_achieved ELSE scores.time_achieved END
  `);

  const getChart = db.prepare(`SELECT id, constant FROM charts WHERE song_id = ? AND difficulty = ?`);

  // Aggregate best scores
  type AggregatedScore = { songId: number; diff: string; score: number; lamp: LampType; timeAchieved: number };
  const bestScores = new Map<string, AggregatedScore>();

  for (const score of rawScores) {
    const diff = chartInfoMap.get(score.chartID);
    if (!diff) continue;

    const songId = score.songID;
    const scoreVal = score.scoreData.score;
    const lampStr = score.scoreData.noteLamp;
    const lamp: LampType = KAMAITACHI_LAMP_MAP[lampStr] || 'FAILED';
    const timeAchieved = score.timeAchieved || score.timeAdded || Date.now();

    const key = `${songId}-${diff}`;
    const existing = bestScores.get(key);

    if (!existing) {
      bestScores.set(key, { songId, diff, score: scoreVal, lamp, timeAchieved });
    } else {
      const newMaxScore = Math.max(existing.score, scoreVal);
      const existingLampVal = LAMP_VALUES[existing.lamp];
      const newLampVal = LAMP_VALUES[lamp];
      const newMaxLamp = newLampVal > existingLampVal ? lamp : existing.lamp;
      
      bestScores.set(key, {
        songId,
        diff,
        score: newMaxScore,
        lamp: newMaxLamp,
        timeAchieved: newMaxScore === scoreVal ? timeAchieved : existing.timeAchieved
      });
    }
  }

  let scoreCount = 0;
  const transaction = db.transaction((scores: IterableIterator<AggregatedScore>) => {
    for (const score of scores) {
      const chart = getChart.get(score.songId, score.diff) as { id: number, constant: number } | undefined;
      if (!chart) continue; // Chart not found

      const op = calculateOp(score.score, chart.constant, score.lamp);

      const result = insertScore.run({
        player_id: player.id,
        chart_id: chart.id,
        score: score.score,
        lamp: score.lamp,
        op: op,
        time_achieved: score.timeAchieved
      });

      if (result.changes > 0) scoreCount++;
    }
  });

  transaction(bestScores.values());
  console.log(`Synced ${scoreCount} scores for ${username}`);
  return { scoreCount };
}

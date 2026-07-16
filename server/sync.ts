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
    INSERT INTO songs (id, title, artist, genre, version, jacket_url, is_jp_active, is_intl_active)
    VALUES (@id, @title, @artist, @genre, @version, @jacket_url, @is_jp_active, @is_intl_active)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      artist = excluded.artist,
      genre = excluded.genre,
      version = excluded.version,
      jacket_url = excluded.jacket_url,
      is_jp_active = excluded.is_jp_active,
      is_intl_active = excluded.is_intl_active
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
      // We no longer filter out non-JP songs completely, we just mark their availability
      insertSong.run({
        id: song.id,
        title: song.title,
        artist: song.artist,
        genre: song.genre,
        version: song.version,
        jacket_url: song.jacket_url || '',
        is_jp_active: (song.availability && song.availability.jp) ? 1 : 0,
        is_intl_active: (song.availability && song.availability.intl) ? 1 : 0
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
    username = meData.body.username;
  }

  // Check blacklist before proceeding
  try {
    const userRes = await fetch(`https://kamai.tachi.ac/api/v1/users/${encodeURIComponent(targetUserId)}`);
    if (userRes.ok) {
      const userData = await userRes.json();
      const kamaitachiId = userData.body.id;
      const isBlacklisted = db.prepare('SELECT kamaitachi_id FROM blacklisted_users WHERE kamaitachi_id = ?').get(kamaitachiId);
      if (isBlacklisted) {
        throw new Error(`User ${username} is blacklisted and cannot be synced.`);
      }
      targetUserId = kamaitachiId.toString();
      username = userData.body.username;
    }
  } catch (err: any) {
    if (err.message.includes('blacklisted')) throw err;
    console.warn(`Could not verify blacklist status before syncing ${username}:`, err.message);
  }

  let rawScores: any[] = [];
  let rawCharts: any[] = [];
  let rawSongs: any[] = [];
  let player: { id: number };

  try {
    const scoresUrl = `https://kamai.tachi.ac/api/v1/users/${encodeURIComponent(targetUserId)}/games/chunithm/pbs/all`;
    const scoresRes = await fetch(scoresUrl, { headers });
    
    if (!scoresRes.ok) {
      if (scoresRes.status === 404) {
        throw new Error(`User not found or has no Chunithm scores on Kamaitachi.`);
      }
      throw new Error(`Failed to fetch scores: ${scoresRes.status} ${scoresRes.statusText}`);
    }
    
    const scoresDataJson = await scoresRes.json();
    rawScores = scoresDataJson.body.pbs || [];
    rawCharts = scoresDataJson.body.charts || [];
    rawSongs = scoresDataJson.body.songs || [];

    // Fetch or create player only after we've confirmed they exist and have scores
    const insertPlayer = db.prepare(`
      INSERT INTO players (username, kamaitachi_id, last_synced_at)
      VALUES (@username, @kamaitachi_id, @now)
      ON CONFLICT(username) DO UPDATE SET
        kamaitachi_id=COALESCE(excluded.kamaitachi_id, players.kamaitachi_id),
        last_synced_at=@now
    `);
    insertPlayer.run({ username, kamaitachi_id: apiKey ? parseInt(targetUserId) || null : null, now: Date.now() });
    player = db.prepare(`SELECT id FROM players WHERE username = ?`).get(username) as { id: number };
  } catch (err: any) {
    if (username.toLowerCase() === 'mock') {
      console.warn('Kamaitachi API failed, falling back to mock data:', err.message);
      
      // Get 250 random MAS/ULT/EXP charts from the DB
      const randomCharts = db.prepare(`
        SELECT id, song_id as songId, difficulty 
        FROM charts 
        WHERE difficulty IN ('MAS', 'ULT', 'EXP') 
        ORDER BY RANDOM() 
        LIMIT 250
      `).all() as any[];
      
      for (const c of randomCharts) {
        const mockChartId = `mock-${c.id}`;
        // Map internal difficulty back to Kamaitachi format
        const ktDiff = Object.keys(KAMAITACHI_DIFF_MAP).find(k => KAMAITACHI_DIFF_MAP[k] === c.difficulty) || 'MASTER';
        
        rawCharts.push({ chartID: mockChartId, difficulty: ktDiff });
        
        // Random score between 950,000 and 1,010,000
        const scoreVal = Math.floor(Math.random() * 60000) + 950000;
        let lamp = 'CLEAR';
        if (scoreVal >= 1009000) lamp = Math.random() > 0.5 ? 'ALL JUSTICE CRITICAL' : 'ALL JUSTICE';
        else if (scoreVal >= 1000000) lamp = Math.random() > 0.4 ? 'ALL JUSTICE' : 'FULL COMBO';
        else if (scoreVal >= 980000) lamp = Math.random() > 0.6 ? 'FULL COMBO' : 'CLEAR';
        
        rawScores.push({
          chartID: mockChartId,
          songID: c.songId,
          scoreData: { score: scoreVal, noteLamp: lamp },
          timeAchieved: Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
        });
      }
    } else {
      throw err;
    }
  }

  // Create chart lookup map
  const chartInfoMap = new Map<string, string>();
  for (const c of rawCharts) {
    if (KAMAITACHI_DIFF_MAP[c.difficulty]) {
      chartInfoMap.set(c.chartID, KAMAITACHI_DIFF_MAP[c.difficulty]);
    }
  }

  // Map Kamaitachi Song ID -> Title
  const kamaiSongMap = new Map<string, string>();
  for (const s of rawSongs) {
    kamaiSongMap.set(s.id, s.title);
  }

  // Pre-fetch all local songs for faster title matching
  const allLocalSongs = db.prepare('SELECT id, title FROM songs').all() as { id: number, title: string }[];
  const localSongTitleMap = new Map<string, number>();
  for (const s of allLocalSongs) {
    localSongTitleMap.set(s.title.toLowerCase().trim(), s.id);
  }

  const insertScore = db.prepare(`
    INSERT INTO scores (player_id, chart_id, score, lamp, clear_lamp, op, time_achieved)
    VALUES (@player_id, @chart_id, @score, @lamp, @clear_lamp, @op, @time_achieved)
    ON CONFLICT(player_id, chart_id) DO UPDATE SET
      score = MAX(excluded.score, scores.score),
      lamp = CASE WHEN excluded.op >= scores.op THEN excluded.lamp ELSE scores.lamp END,
      clear_lamp = CASE WHEN excluded.op >= scores.op THEN excluded.clear_lamp ELSE scores.clear_lamp END,
      op = MAX(excluded.op, scores.op),
      time_achieved = CASE WHEN excluded.score > scores.score THEN excluded.time_achieved ELSE scores.time_achieved END
  `);

  const getChart = db.prepare(`SELECT id, constant FROM charts WHERE song_id = ? AND difficulty = ?`);

  // Aggregate best scores
  type AggregatedScore = { songId: number; diff: string; score: number; lamp: LampType; clearLamp: string; timeAchieved: number };
  const bestScores = new Map<string, AggregatedScore>();

  for (const score of rawScores) {
    const diff = chartInfoMap.get(score.chartID);
    if (!diff) continue;

    // Use chart.data.inGameID to perfectly match Kamaitachi charts with Beerpsi's DB
    // Fall back to title matching only if inGameID is missing or 0
    let localSongId = 0;
    
    // Kamaitachi includes chart info in the root `body.charts` array.
    // We can look it up by chartID to find the inGameID.
    const kamaiChart = rawCharts.find((c: any) => c.chartID === score.chartID);
    if (kamaiChart && kamaiChart.data && kamaiChart.data.inGameID) {
      localSongId = kamaiChart.data.inGameID;
    } else {
      const kamaiTitle = kamaiSongMap.get(score.songID);
      if (kamaiTitle) {
        localSongId = localSongTitleMap.get(kamaiTitle.toLowerCase().trim()) || 0;
      }
    }

    if (!localSongId) {
      console.warn(`Could not find local DB match for Kamaitachi chart: ${score.chartID}`);
      continue;
    }

    const songId = localSongId;
    
    // Check if the song is active in our local database
    const localSong = db.prepare('SELECT id FROM songs WHERE id = ?').get(songId);
    if (!localSong) {
      console.log(`Skipping unknown chart for song ID: ${songId}`);
      continue;
    }
    const scoreVal = score.scoreData.score;
    const lampStr = score.scoreData.noteLamp;
    let lamp: LampType = KAMAITACHI_LAMP_MAP[lampStr] || 'CLEAR';
    const clearLamp = score.scoreData.clearLamp || 'CLEAR';
    if (lamp === 'CLEAR' && clearLamp === 'FAILED') {
      lamp = 'FAILED';
    }
    const timeAchieved = score.timeAchieved || score.timeAdded || Date.now();

    const key = `${songId}-${diff}`;
    const existing = bestScores.get(key);

    if (!existing) {
      bestScores.set(key, { songId, diff, score: scoreVal, lamp, clearLamp, timeAchieved });
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
        clearLamp: newMaxScore === scoreVal ? clearLamp : existing.clearLamp,
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
        clear_lamp: score.clearLamp,
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

import { Router, type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import { default as db, DB_PATH } from './db.js';
import { syncPlayer } from './sync.js';
import { getChartFilterConditions } from './utils/filters.js';
import { exec } from 'node:child_process';
const upload = multer({ dest: path.join(process.cwd(), 'data', 'temp') });

export const router = Router();



const MAX_CONCURRENT_IMPORTS = 5;
let activeImports = 0;

const IP_RL_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_IP = 5;
const ipRequests = new Map<string, number[]>();

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  let timestamps = ipRequests.get(ip) || [];
  timestamps = timestamps.filter(t => now - t < IP_RL_WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS_PER_IP) return false;
  timestamps.push(now);
  ipRequests.set(ip, timestamps);
  return true;
}

// 1. Import Player
router.post('/players/import', async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';

  if (!checkIpRateLimit(clientIp)) {
    return res.status(429).json({ error: 'Too many requests from this IP. Please try again later.' });
  }

  if (activeImports >= MAX_CONCURRENT_IMPORTS) {
    return res.status(429).json({ error: 'Server is currently busy importing other users. Please try again in a moment.' });
  }

  try {
    const player = db.prepare(`SELECT last_synced_at FROM players WHERE username = ?`).get(username) as { last_synced_at: number } | undefined;
    if (player && Date.now() - player.last_synced_at < 5 * 60 * 1000) {
      return res.status(429).json({ error: `User ${username} was synced recently. Please wait 5 minutes between imports.` });
    }
    
    activeImports++;
    await syncPlayer(username);
    res.json({ success: true });
  } catch (err: any) {
    console.error(`Failed to import player:`, err);
    res.status(500).json({ error: err.message });
  } finally {
    activeImports--;
  }
});

// 1.5 Get All Players
router.get('/players', (req, res) => {
  try {
    const players = db.prepare(`SELECT username, last_synced_at FROM players ORDER BY username ASC`).all();
    res.json(players);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Global Leaderboard
router.get('/leaderboard', (req, res) => {
  const { page = 1, limit = 50, server = 'jp', version = 'X-VERSE-X' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  // Map server query to db column
  let serverCondition = '';
  if (server === 'jp') serverCondition = 'AND songs.is_jp_active = 1';
  else if (server === 'intl') serverCondition = 'AND songs.is_intl_active = 1';
  
  const VERSION_ORDER = [
    'CHUNITHM', 'CHUNITHM PLUS', 'AIR', 'AIR PLUS', 'STAR', 'STAR PLUS',
    'AMAZON', 'AMAZON PLUS', 'CRYSTAL', 'CRYSTAL PLUS', 'PARADISE', 'PARADISE LOST',
    'NEW', 'NEW PLUS', 'SUN', 'SUN PLUS', 'LUMINOUS', 'LUMINOUS PLUS',
    'VERSE', 'X-VERSE', 'X-VERSE-X', 'MATE',
  ];

  let versionFilter = '';
  const versionParams: any[] = [];
  let selectedVersionIdx = VERSION_ORDER.indexOf(version as string);
  if (selectedVersionIdx < 0) selectedVersionIdx = VERSION_ORDER.length - 1; // Default to all if invalid
  
  const includedVersions = VERSION_ORDER.slice(0, selectedVersionIdx + 1);
  const placeholders = includedVersions.map(() => '?').join(',');
  versionFilter = `AND songs.version IN (${placeholders})`;
  versionParams.push(...includedVersions);

  // Determine total active songs for denominator
  const totalActiveSongs = (db.prepare(`
    SELECT COUNT(DISTINCT song_id) as count
    FROM charts c
    JOIN songs ON c.song_id = songs.id
    WHERE c.difficulty != 'WE' AND (c.song_id NOT IN (50, 81) AND c.id != 239116) ${serverCondition}
    ${versionFilter}
  `).get(...versionParams) as any).count;

  const playersQuery = `
    SELECT p.id, p.username, 
           IFNULL(SUM(max_scores.max_op), 0) as total_op,
           IFNULL(ROUND((SUM(CAST(max_scores.max_op AS REAL) / song_max.max_song_op) / ?) * 100, 2), 0) as op_percent
    FROM players p
    LEFT JOIN (
      SELECT s.player_id, c.song_id, MAX(s.op) as max_op
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      JOIN songs on c.song_id = songs.id
      WHERE c.difficulty != 'WE' AND (c.song_id NOT IN (50, 81) AND c.id != 239116) ${serverCondition} ${versionFilter}
      GROUP BY s.player_id, c.song_id
    ) max_scores ON p.id = max_scores.player_id
    LEFT JOIN (
      SELECT c.song_id, ((MAX(c.constant) * 5000 + 15000) / 5) * 5 as max_song_op
      FROM charts c
      JOIN charts c2 ON c.song_id = c2.song_id AND c2.difficulty != 'WE' AND (c2.song_id NOT IN (50, 81) AND c2.id != 239116)
      JOIN songs on c.song_id = songs.id
      WHERE c.difficulty != 'WE' AND (c.song_id NOT IN (50, 81) AND c.id != 239116) ${serverCondition} ${versionFilter}
      GROUP BY c.song_id
    ) song_max ON max_scores.song_id = song_max.song_id
    GROUP BY p.id
    HAVING total_op > 0
    ORDER BY total_op DESC
    LIMIT ? OFFSET ?
  `;
  
  const queryParams = [totalActiveSongs, ...versionParams, ...versionParams, Number(limit), Number(offset)];
  const topPlayers = db.prepare(playersQuery).all(...queryParams) as any[];
  const totalPlayers = (db.prepare(`SELECT COUNT(DISTINCT s.player_id) as count FROM scores s JOIN charts c ON s.chart_id = c.id JOIN songs ON c.song_id = songs.id WHERE 1=1 ${serverCondition} ${versionFilter}`).get(...versionParams) as any).count;

  // Pre-calculate total MAS/ULT charts and Max OP per version
  const cumulativeVersionData: Record<string, { totalMasUlt: number, totalSongOp: number }> = {};
  for (let i = 0; i <= selectedVersionIdx; i++) {
    const v = VERSION_ORDER[i];
    const allowed = VERSION_ORDER.slice(0, i + 1);
    const p = allowed.map(() => '?').join(',');
    
    const masUlt = (db.prepare(`SELECT COUNT(*) as count FROM charts c JOIN songs ON c.song_id = songs.id WHERE c.difficulty IN ('MAS', 'ULT') ${serverCondition} AND songs.version IN (${p}) AND (c.song_id NOT IN (50, 81) AND c.id != 239116)`).get(...allowed) as any).count;
    
    const maxOpQuery = db.prepare(`
      SELECT IFNULL(SUM(((max_const * 5000 + 15000) / 5) * 5), 0) as total_op FROM (
        SELECT MAX(c.constant) as max_const
        FROM charts c
        JOIN songs ON c.song_id = songs.id
        WHERE c.difficulty != 'WE' ${serverCondition} AND songs.version IN (${p}) AND (c.song_id NOT IN (50, 81) AND c.id != 239116)
        GROUP BY c.song_id
      )
    `).get(...allowed) as any;
    
    const activeSongs = (db.prepare(`SELECT COUNT(DISTINCT song_id) as count FROM charts c JOIN songs ON c.song_id = songs.id WHERE c.difficulty != 'WE' ${serverCondition} AND songs.version IN (${p}) AND (c.song_id NOT IN (50, 81) AND c.id != 239116)`).get(...allowed) as any).count;
    
    cumulativeVersionData[v] = { totalMasUlt: masUlt, totalSongOp: maxOpQuery.total_op, activeSongs };
  }

  // Determine highest possession for each top player
  const result = topPlayers.map(player => {
    let bestPossessionTier = -1;
    let possessionStr = 'None';
    const tiers = ['Silver', 'Gold', 'Platinum', 'Rainbow'];

    // Fetch all max OP scores for this player across all active songs
    const playerScores = db.prepare(`
      SELECT songs.version, MAX(s.op) as max_op
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      JOIN songs ON c.song_id = songs.id
      WHERE s.player_id = ? AND c.difficulty != 'WE' AND (c.song_id NOT IN (50, 81) AND c.id != 239116) ${serverCondition}
      GROUP BY c.song_id
    `).all(player.id) as any[];

    // Fetch all Master/Ultima scores for this player to tally grades
    const playerMasUltScores = db.prepare(`
      SELECT songs.version, s.score
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      JOIN songs ON c.song_id = songs.id
      WHERE s.player_id = ? AND c.difficulty IN ('MAS', 'ULT') AND (c.song_id NOT IN (50, 81) AND c.id != 239116) ${serverCondition}
    `).all(player.id) as any[];

    // Group OP by version
    const opByVersion: Record<string, number> = {};
    for (const score of playerScores) {
      opByVersion[score.version] = (opByVersion[score.version] || 0) + score.max_op;
    }

    // Group grade counts by version
    const gradeCountsByVersion: Record<string, { sss: number, ss: number, sPlus: number, s: number }> = {};
    for (const s of playerMasUltScores) {
      if (!gradeCountsByVersion[s.version]) gradeCountsByVersion[s.version] = { sss: 0, ss: 0, sPlus: 0, s: 0 };
      if (s.score >= 1007500) gradeCountsByVersion[s.version].sss++;
      if (s.score >= 1000000) gradeCountsByVersion[s.version].ss++;
      if (s.score >= 990000) gradeCountsByVersion[s.version].sPlus++;
      if (s.score >= 975000) gradeCountsByVersion[s.version].s++;
    }

    let cumulativeOp = 0;
    let cumulativeSss = 0, cumulativeSs = 0, cumulativeSPlus = 0, cumulativeS = 0;
    for (let i = 0; i <= selectedVersionIdx; i++) {
      const v = VERSION_ORDER[i];
      cumulativeOp += (opByVersion[v] || 0);
      if (gradeCountsByVersion[v]) {
         cumulativeSss += gradeCountsByVersion[v].sss;
         cumulativeSs += gradeCountsByVersion[v].ss;
         cumulativeSPlus += gradeCountsByVersion[v].sPlus;
         cumulativeS += gradeCountsByVersion[v].s;
      }

      const vData = cumulativeVersionData[v];
      if (!vData || vData.activeSongs === 0) continue;

      const opPercent = (cumulativeOp / vData.totalSongOp) * 100;

      let currentTier = -1;
      if (cumulativeSss >= vData.totalMasUlt && opPercent >= 99.5) currentTier = 3;
      else if (cumulativeSs >= vData.totalMasUlt && opPercent >= 99) currentTier = 2;
      else if (cumulativeSPlus >= vData.totalMasUlt && opPercent >= 97.5) currentTier = 1;
      else if (cumulativeS >= vData.totalMasUlt) currentTier = 0;

      if (i === selectedVersionIdx) {
        possessionStr = currentTier >= 0 ? tiers[currentTier] : 'None';
      }
    }

    return {
      username: player.username,
      totalOp: (player.total_op || 0) / 1000,
      opPercent: player.op_percent || 0,
      possession: possessionStr
    };
  });

  res.json({
    data: result,
    total: totalPlayers,
    page,
    limit,
    totalPages: Math.ceil(totalPlayers / Number(limit))
  });
});

// 3. Get Player Dashboard Data
router.get('/players/:username', (req, res) => {
  const { username } = req.params;
  const player = db.prepare(`SELECT id, last_synced_at FROM players WHERE username = ?`).get(username) as any;
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const { conditions, bindings } = getChartFilterConditions(req.query, 'songs', 'c');
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Determine total active songs for the selected filters
  const totalActiveSongs = (db.prepare(`
    SELECT COUNT(DISTINCT song_id) as count
    FROM charts c
    JOIN songs ON c.song_id = songs.id
    ${whereClause}
  `).get(...bindings) as any).count || 1; // fallback to 1 to avoid division by zero

  // Get MAX OP per song to sum and calculate OP%
  const opData = (db.prepare(`
    SELECT 
      IFNULL(SUM(max_scores.max_op), 0) as total_op_raw,
      IFNULL(ROUND((SUM(CAST(max_scores.max_op AS REAL) / song_max.max_song_op) / ?) * 100, 2), 0) as op_percent
    FROM (
      SELECT c.song_id, MAX(s.op) as max_op
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      JOIN songs ON c.song_id = songs.id
      WHERE s.player_id = ? AND ${conditions.join(' AND ')}
      GROUP BY c.song_id
    ) max_scores
    LEFT JOIN (
      SELECT c.song_id, ((MAX(c.constant) * 5000 + 15000) / 5) * 5 as max_song_op
      FROM charts c
      JOIN songs on c.song_id = songs.id
      ${whereClause}
      GROUP BY c.song_id
    ) song_max ON max_scores.song_id = song_max.song_id
  `).get(totalActiveSongs, player.id, ...bindings, ...bindings) as any);

  const totalMaxOp = (db.prepare(`
    SELECT IFNULL(SUM(song_max_op), 0) as total_max_op FROM (
      SELECT ((MAX(c.constant) * 5000 + 15000) / 5) * 5 as song_max_op
      FROM charts c
      JOIN songs ON c.song_id = songs.id
      ${whereClause}
      GROUP BY c.song_id
    )
  `).get(...bindings) as any).total_max_op;

  const totalOp = opData.total_op_raw / 1000;
  const totalPossibleOp = totalMaxOp / 1000;
  const opPercent = opData.op_percent;

  // Get other stats directly from scores
  const stats = db.prepare(`
    SELECT 
      COUNT(s.id) as scoreCount,
      AVG(s.score) as averageScore,
      SUM(CASE WHEN s.lamp = 'AJC' THEN 1 ELSE 0 END) as ajcCount,
      SUM(CASE WHEN s.lamp = 'AJ' THEN 1 ELSE 0 END) as ajCount,
      SUM(CASE WHEN s.lamp = 'FC' THEN 1 ELSE 0 END) as fcCount,
      SUM(CASE WHEN s.clear_lamp != 'FAILED' THEN 1 ELSE 0 END) as clearCount
    FROM scores s
    JOIN charts c ON s.chart_id = c.id
    JOIN songs ON c.song_id = songs.id
    WHERE s.player_id = ? AND ${conditions.join(' AND ')}
  `).get(player.id, ...bindings) as any;

  // Get lamp distribution grouped by chart level
  const lampQuery = db.prepare(`
    SELECT 
      c.level,
      CASE 
        WHEN s.lamp IN ('AJC', 'AJ', 'FC') THEN s.lamp
        WHEN s.clear_lamp = 'FAILED' THEN 'FAILED'
        ELSE 'CLEAR'
      END as display_lamp,
      COUNT(*) as count
    FROM scores s
    JOIN charts c ON s.chart_id = c.id
    JOIN songs ON c.song_id = songs.id
    WHERE s.player_id = ? AND ${conditions.join(' AND ')}
    GROUP BY c.level, display_lamp
  `).all(player.id, ...bindings) as any[];

  const totalChartsQuery = db.prepare(`
    SELECT level, COUNT(*) as count
    FROM charts c
    JOIN songs ON c.song_id = songs.id
    ${whereClause}
    GROUP BY level
  `).all(...bindings) as any[];

  const levelStats: Record<string, any> = {};
  totalChartsQuery.forEach(row => {
    levelStats[row.level] = { level: row.level, AJC: 0, AJ: 0, FC: 0, CLEAR: 0, FAILED: 0, UNPLAYED: row.count };
  });

  lampQuery.forEach(row => {
    if (levelStats[row.level]) {
      levelStats[row.level][row.display_lamp] += row.count;
      levelStats[row.level].UNPLAYED -= row.count;
    }
  });
  
  // Sort the levels logically
  const sortedLevelStats = Object.values(levelStats).sort((a, b) => {
    const parseLevel = (lvl: string) => {
      let num = parseFloat(lvl.replace(/[^0-9.]/g, ''));
      if (lvl.includes('+')) num += 0.5;
      return num;
    };
    return parseLevel(a.level) - parseLevel(b.level);
  });

  res.json({
    username,
    totalOp: Number(totalOp.toFixed(2)),
    totalPossibleOp: Number(totalPossibleOp.toFixed(2)),
    opPercent,
    averageScore: Math.round(stats.averageScore || 0),
    ajcCount: stats.ajcCount || 0,
    ajCount: stats.ajCount || 0,
    fcCount: stats.fcCount || 0,
    clearCount: stats.clearCount || 0,
    scoreCount: stats.scoreCount || 0,
    lastSynced: player.last_synced_at,
    levelStats: sortedLevelStats
  });
});

// 4. Get Player Scores (Top 500 by OP)
router.get('/players/:username/scores', (req, res) => {
  const { username } = req.params;
  const limit = parseInt(req.query.limit as string) || 500;
  
  const { conditions, bindings } = getChartFilterConditions(req.query, 'so', 'c');
  
  const scores = db.prepare(`
    SELECT 
      so.id as songId,
      so.title as songTitle,
      so.artist,
      c.difficulty,
      c.constant,
      c.level,
      s.score,
      s.lamp,
      s.op,
      s.time_achieved as timeAchieved
    FROM scores s
    JOIN players p ON s.player_id = p.id
    JOIN charts c ON s.chart_id = c.id
    JOIN songs so ON c.song_id = so.id
    WHERE p.username = ? AND ${conditions.join(' AND ')}
    ORDER BY s.op DESC
    LIMIT ?
  `).all(username, ...bindings, limit);

  res.json(scores);
});

// 5. Get Songs List
router.get('/songs', (req, res) => {
  // Fetch all songs
  const songs = db.prepare(`SELECT id, title, artist, genre, version, jacket_url, is_jp_active, is_intl_active FROM songs`).all() as any[];
  
  // Fetch all charts and attach to songs, excluding ghost charts
  const charts = db.prepare(`SELECT id, song_id, difficulty, constant, level, note_count FROM charts WHERE (song_id NOT IN (50, 81) AND id != 239116)`).all() as any[];
  
  const songMap = new Map();
  songs.forEach(s => {
    s.charts = [];
    songMap.set(s.id, s);
  });

  charts.forEach(c => {
    const song = songMap.get(c.song_id);
    if (song) {
      song.charts.push({
        difficulty: c.difficulty,
        constant: c.constant,
        level: c.level,
        noteCount: c.note_count
      });
    }
  });

  res.json(songs);
});

// 6. Get Chart Leaderboard
router.get('/songs/:songId/charts/:difficulty/leaderboard', (req, res) => {
  const { songId, difficulty } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  // Fetch all scores for calculating accurate distributions
  const allScoresQuery = db.prepare(`
    SELECT s.score
    FROM scores s
    JOIN charts c ON s.chart_id = c.id
    WHERE c.song_id = ? AND c.difficulty = ?
  `).all(songId, difficulty) as { score: number }[];

  const leaderboard = db.prepare(`
    SELECT p.username, s.score, s.lamp, s.op, s.time_achieved as timeAchieved,
           ROUND((CAST(s.op AS REAL) / (((c.constant * 5000 + 15000) / 5) * 5)) * 100, 2) as opPercent
    FROM scores s
    JOIN players p ON s.player_id = p.id
    JOIN charts c ON s.chart_id = c.id
    WHERE c.song_id = ? AND c.difficulty = ?
    ORDER BY s.score DESC, s.time_achieved ASC
    LIMIT ? OFFSET ?
  `).all(songId, difficulty, limit, offset);

  // Compute Grade Distribution (Bar Chart)
  const gradeBins = [
    { name: 'SSS+', min: 1009000, count: 0 },
    { name: 'SSS', min: 1007500, count: 0 },
    { name: 'SS+', min: 1005000, count: 0 },
    { name: 'SS', min: 1000000, count: 0 },
    { name: 'S+', min: 990000, count: 0 },
    { name: 'S', min: 975000, count: 0 },
    { name: '< S', min: 0, count: 0 },
  ];

  allScoresQuery.forEach(row => {
    for (let i = 0; i < gradeBins.length; i++) {
      if (row.score >= gradeBins[i].min) {
        gradeBins[i].count++;
        break;
      }
    }
  });
  const gradeDistribution = gradeBins.reverse();

  // Compute Normal Distribution (Line Chart)
  const normalBinsMap = new Map<number, number>();
  for (let i = 975000; i <= 1010000; i += 5000) {
    normalBinsMap.set(i, 0);
  }
  normalBinsMap.set(0, 0); // Catch-all for < 975k

  allScoresQuery.forEach(row => {
    let bucket = 0;
    if (row.score >= 975000) {
      bucket = Math.floor(row.score / 5000) * 5000;
      if (bucket > 1010000) bucket = 1010000;
    }
    normalBinsMap.set(bucket, (normalBinsMap.get(bucket) || 0) + 1);
  });

  const normalDistribution = Array.from(normalBinsMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, count]) => ({
      bucket: bucket === 0 ? '< 975k' : (bucket / 1000).toString() + 'k',
      count
    }));

  res.json({
    data: leaderboard,
    total: allScoresQuery.length,
    page,
    limit,
    totalPages: Math.ceil(allScoresQuery.length / limit),
    gradeDistribution,
    normalDistribution
  });
});

// 5. Get Aggregate Performance Heatmap Data
router.get('/performance/heatmap', (req, res) => {
  const { conditions, bindings } = getChartFilterConditions(req.query, 'songs', 'c', 'p');
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const groupByCol = 'c.constant';

  const data = db.prepare(`
    SELECT 
      ${groupByCol} as constant,
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
    JOIN players p ON s.player_id = p.id
    JOIN charts c ON s.chart_id = c.id
    JOIN songs ON c.song_id = songs.id
    ${whereClause}
    GROUP BY ${groupByCol}, grade
  `).all(...bindings);
  res.json(data);
});

// 6. Get Aggregate Global Chart Meta (Popularity vs Average Score)
router.get('/performance/meta', (req, res) => {
  const { conditions, bindings } = getChartFilterConditions(req.query, 'so', 'c', 'p');
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const data = db.prepare(`
    SELECT 
      c.song_id,
      c.difficulty,
      c.constant,
      so.title,
      COUNT(s.player_id) as playCount,
      AVG(s.score) as avgScore
    FROM scores s
    JOIN players p ON s.player_id = p.id
    JOIN charts c ON s.chart_id = c.id
    JOIN songs so ON c.song_id = so.id
    ${whereClause}
    GROUP BY c.id
  `).all(...bindings);
  res.json(data);
});

// 7. Get Global Server Lamp Distribution by Constant
router.get('/performance/lamps', (req, res) => {
  const { conditions, bindings } = getChartFilterConditions(req.query, 'songs', 'c', 'p');
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const isMasUltOnly = typeof req.query.diff === 'string' ? req.query.diff.split(',').every(d => d === 'MAS' || d === 'ULT') : false;
  const groupByCol = isMasUltOnly ? 'c.constant' : 'CAST((c.constant * 2) AS INTEGER) / 2.0';

  const data = db.prepare(`
    SELECT 
      ${groupByCol} as constant,
      SUM(CASE WHEN s.lamp = 'AJC' THEN 1 ELSE 0 END) as ajc,
      SUM(CASE WHEN s.lamp = 'AJ' THEN 1 ELSE 0 END) as aj,
      SUM(CASE WHEN s.lamp = 'FC' THEN 1 ELSE 0 END) as fc,
      SUM(CASE WHEN s.lamp = 'CLEAR' THEN 1 ELSE 0 END) as clear,
      SUM(CASE WHEN s.lamp = 'FAILED' THEN 1 ELSE 0 END) as failed,
      COUNT(*) as total
    FROM scores s
    JOIN players p ON s.player_id = p.id
    JOIN charts c ON s.chart_id = c.id
    JOIN songs ON c.song_id = songs.id
    ${whereClause}
    GROUP BY ${groupByCol}
  `).all(...bindings);
  res.json(data);
});

// 8. Get Average OP Yield by Constant
router.get('/performance/op', (req, res) => {
  const { conditions, bindings } = getChartFilterConditions(req.query, 'songs', 'c', 'p');
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const isMasUltOnly = typeof req.query.diff === 'string' ? req.query.diff.split(',').every(d => d === 'MAS' || d === 'ULT') : false;
  const groupByCol = isMasUltOnly ? 'c.constant' : 'CAST((c.constant * 2) AS INTEGER) / 2.0';

  const data = db.prepare(`
    SELECT 
      ${groupByCol} as constant,
      AVG(s.op * 100.0 / (((c.constant * 5000 + 15000) / 5) * 5)) as avgOp,
      MAX(s.op) as maxOp,
      COUNT(*) as playCount
    FROM scores s
    JOIN players p ON s.player_id = p.id
    JOIN charts c ON s.chart_id = c.id
    JOIN songs ON c.song_id = songs.id
    ${whereClause}
    GROUP BY ${groupByCol}
  `).all(...bindings);
  res.json(data);
});

// 9. Get Player OP Percent Distribution
router.get('/performance/players', (req, res) => {
  const { conditions, bindings } = getChartFilterConditions(req.query, 'songs', 'c');
  const chartWhereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  let pWhere = '';
  const pBindings: any[] = [];
  if (req.query.ratingMin || req.query.ratingMax) {
    const pConds = [];
    if (req.query.ratingMin) { pConds.push(`p.kamaitachi_rating >= ?`); pBindings.push(parseFloat(req.query.ratingMin as string)); }
    if (req.query.ratingMax) { pConds.push(`p.kamaitachi_rating <= ?`); pBindings.push(parseFloat(req.query.ratingMax as string)); }
    pWhere = `WHERE ${pConds.join(' AND ')}`;
  }

  const totalActiveSongs = (db.prepare(`
    SELECT COUNT(DISTINCT song_id) as count
    FROM charts c
    JOIN songs ON c.song_id = songs.id
    ${chartWhereClause}
  `).get(...bindings) as any).count || 1;

  const rawData = db.prepare(`
    SELECT 
      p.username,
      IFNULL(SUM(max_scores.max_op), 0) as totalOp,
      IFNULL(ROUND((SUM(CAST(max_scores.max_op AS REAL) / song_max.max_song_op) / ?) * 100, 2), 0) as opPercent
    FROM players p
    JOIN (
      SELECT s.player_id, c.song_id, MAX(s.op) as max_op
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      JOIN songs ON c.song_id = songs.id
      ${chartWhereClause}
      GROUP BY s.player_id, c.song_id
    ) max_scores ON p.id = max_scores.player_id
    JOIN (
      SELECT c.song_id, ((MAX(c.constant) * 5000 + 15000) / 5) * 5 as max_song_op
      FROM charts c
      JOIN songs on c.song_id = songs.id
      ${chartWhereClause}
      GROUP BY c.song_id
    ) song_max ON max_scores.song_id = song_max.song_id
    ${pWhere}
    GROUP BY p.username
    HAVING totalOp > 0
    ORDER BY totalOp DESC
  `).all(totalActiveSongs, ...bindings, ...bindings, ...pBindings) as any[];

  const data = rawData.map(row => {
    return {
      username: row.username,
      totalOp: row.totalOp / 1000,
      opPercent: row.opPercent
    };
  });

  res.json(data);
});

// 10. Admin & Scraper Controls
import { runGlobalScrape, stopGlobalScrape, getScraperStatus, runGlobalSync, getSyncAllStatus, globalSyncState } from './scraper.js';
import { getSchedulerStatus, startScheduler, stopScheduler, updateScrapeBounds } from './scheduler.js';

const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization;
  if (!process.env.ADMIN_API_KEY) {
    res.status(500).json({ error: 'Server missing ADMIN_API_KEY configuration.' });
    return;
  }
  if (token !== process.env.ADMIN_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
};

router.get('/admin/verify', adminAuth, (req, res) => {
  res.json({ success: true });
});

router.delete('/admin/players/:username', adminAuth, (req, res) => {
  const { username } = req.params;
  try {
    const player = db.prepare(`SELECT id FROM players WHERE username = ?`).get(username) as { id: number } | undefined;
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    db.prepare(`DELETE FROM scores WHERE player_id = ?`).run(player.id);
    db.prepare(`DELETE FROM players WHERE id = ?`).run(player.id);
    res.json({ success: true, message: `Deleted ${username} and all their scores.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/backup', adminAuth, async (req, res) => {
  try {
    const backupPath = path.join(process.cwd(), 'data', `backup-${Date.now()}.sqlite`);
    await db.backup(backupPath);
    res.download(backupPath, 'chunitrrracker_backup.sqlite', (err) => {
      if (!err && fs.existsSync(backupPath)) fs.unlinkSync(backupPath);
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/restore', adminAuth, upload.single('database'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    // 1. Force checkpoint and truncate WAL before closing so it doesn't corrupt the restored DB
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
    } catch (e) {
      console.error('Failed to checkpoint WAL:', e);
    }

    // 2. Close current DB
    db.close();
    
    // 3. Overwrite file
    fs.copyFileSync(req.file.path, DB_PATH);
    
    // 4. Delete WAL and SHM to prevent corruption if they exist
    // On Windows, these files may remain locked by the OS for a few milliseconds after closing.
    // If we checkpointed successfully, it is safe if they fail to delete because they are 0 bytes.
    try { if (fs.existsSync(DB_PATH + '-wal')) fs.unlinkSync(DB_PATH + '-wal'); } catch (e) { console.warn('Could not delete WAL', e); }
    try { if (fs.existsSync(DB_PATH + '-shm')) fs.unlinkSync(DB_PATH + '-shm'); } catch (e) { console.warn('Could not delete SHM', e); }
    
    // 5. Delete temp file
    try { fs.unlinkSync(req.file.path); } catch (e) {}
    
    res.json({ success: true, message: 'Database restored successfully. Server is restarting...' });
    
    // 5. Force restart the server
    setTimeout(() => {
      process.exit(0); 
    }, 1000);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/admin/sync-all/status', adminAuth, (req, res) => {
  res.json(getSyncAllStatus());
});

router.post('/admin/sync-all', adminAuth, async (req, res) => {
  if (globalSyncState.isSyncing) {
    return res.status(400).json({ error: 'A global sync is already in progress.' });
  }

  const players = db.prepare(`SELECT COUNT(*) as count FROM players`).get() as { count: number };
  res.json({ success: true, message: `Started background sync for ${players.count} players.` });
  
  // Fire and forget
  runGlobalSync().catch(err => console.error("Global sync error:", err));
});

router.post('/scraper/start', adminAuth, (req, res) => {
  const { startId = 1, endId = 5000 } = req.body;
  runGlobalScrape(startId, endId)
    .then((lastValidId) => {
      if (lastValidId !== undefined) {
        updateScrapeBounds(lastValidId);
      }
    })
    .catch(console.error);
  res.json({ success: true, message: `Scraper started from ID ${startId} to ${endId}` });
});

router.post('/scraper/stop', adminAuth, (req, res) => {
  stopGlobalScrape();
  res.json({ success: true, message: 'Scraper stopping.' });
});

router.get('/scraper/status', adminAuth, (req, res) => {
  res.json(getScraperStatus());
});

router.get('/admin/scheduler', adminAuth, (req, res) => {
  res.json(getSchedulerStatus());
});

router.post('/admin/scheduler/start', adminAuth, (req, res) => {
  const { syncCron, scrapeCron, scrapeStartId, scrapeEndId } = req.body;
  startScheduler(syncCron, scrapeCron, scrapeStartId, scrapeEndId);
  res.json({ success: true, message: 'Scheduler started.', status: getSchedulerStatus() });
});

router.post('/admin/scheduler/stop', adminAuth, (req, res) => {
  stopScheduler();
  res.json({ success: true, message: 'Scheduler stopped.', status: getSchedulerStatus() });
});

router.get('/admin/blacklist', adminAuth, (req, res) => {
  const users = db.prepare(`SELECT kamaitachi_id, username, added_at FROM blacklisted_users ORDER BY added_at DESC`).all();
  res.json(users);
});

router.post('/admin/blacklist', adminAuth, async (req, res) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'identifier is required' });

  try {
    const response = await fetch(`https://kamai.tachi.ac/api/v1/users/${encodeURIComponent(identifier)}`);
    if (!response.ok) {
      if (response.status === 404) return res.status(404).json({ error: 'User not found on Kamaitachi.' });
      throw new Error(`Kamaitachi API error: ${response.status}`);
    }
    const data = await response.json();
    const resolvedKamaitachiId = data.body.id;
    const username = data.body.username;

    db.prepare(`INSERT OR REPLACE INTO blacklisted_users (kamaitachi_id, username, added_at) VALUES (?, ?, ?)`).run(
      resolvedKamaitachiId, username, Date.now()
    );

    // Purge existing data
    const existingPlayer = db.prepare('SELECT id FROM players WHERE kamaitachi_id = ? OR username = ?').get(resolvedKamaitachiId, username) as {id: number} | undefined;
    if (existingPlayer) {
      db.prepare('DELETE FROM scores WHERE player_id = ?').run(existingPlayer.id);
      db.prepare('DELETE FROM players WHERE id = ?').run(existingPlayer.id);
    }

    res.json({ success: true, message: `Added ${username} to blacklist and purged their data.` });
  } catch (err: any) {
    console.error('Error adding to blacklist:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/blacklist/:id', adminAuth, (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare(`DELETE FROM blacklisted_users WHERE kamaitachi_id = ?`).run(id);
  res.json({ success: true, message: 'Removed from blacklist.' });
});

router.get('/admin/update/check', adminAuth, async (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    let latestVersion = 'Unknown';
    let url = '';

    if (isProd) {
      const response = await fetch('https://api.github.com/repos/Lolergags/ChuniTrrracker/releases');
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          latestVersion = data[0].tag_name;
          url = data[0].html_url;
        }
      }
    }
    
    // Fallback to commits if not prod or no releases exist yet
    if (latestVersion === 'Unknown') {
      const response = await fetch('https://api.github.com/repos/Lolergags/ChuniTrrracker/commits/main');
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
      const data = await response.json();
      latestVersion = data ? data.sha.substring(0, 7) : 'Unknown';
      url = data ? data.html_url : '';
    }
    
    const checkCmd = isProd ? 'git describe --tags --exact-match || git rev-parse --short HEAD' : 'git rev-parse --short HEAD';
    exec(checkCmd, (error, stdout) => {
      let currentCommit = 'Unknown';
      if (!error) {
        currentCommit = stdout.trim();
      }
      res.json({ latestVersion, url, currentCommit, isProd });
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/update/apply', adminAuth, (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.json({ success: true, message: 'Update process started in background. Server will restart shortly.' });
  
  setTimeout(() => {
    const cmd = isProd 
      ? 'git fetch --tags && (git checkout $(git describe --tags `git rev-list --tags --max-count=1` 2>/dev/null) || git pull origin main) && npm install && npm run build'
      : 'git pull && npm install && npm run build';
      
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Update error: ${error.message}`);
        return;
      }
      console.log(`Update stdout: ${stdout}`);
      console.error(`Update stderr: ${stderr}`);
      process.exit(0);
    });
  }, 1000);
});

export default router;

import { Router, type Request, type Response, type NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import db from './db.js';
import { syncPlayer } from './sync.js';
import { getChartFilterConditions } from './utils/filters.js';

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
  const { page = 1, limit = 50, server = 'jp', version = 'all' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  // Map server query to db column
  const serverCol = server === 'intl' ? 'is_intl_active' : 'is_jp_active';
  
  // Ordered version list (earliest to latest) — matches the game's release order
  const VERSION_ORDER = [
    'CHUNITHM', 'CHUNITHM PLUS', 'AIR', 'AIR PLUS', 'STAR', 'STAR PLUS',
    'AMAZON', 'AMAZON PLUS', 'CRYSTAL', 'CRYSTAL PLUS', 'PARADISE', 'PARADISE LOST',
    'NEW', 'NEW PLUS', 'SUN', 'SUN PLUS', 'LUMINOUS', 'LUMINOUS PLUS',
    'VERSE', 'X-VERSE', 'X-VERSE-X', 'MATE',
  ];

  // Build version filter: include all songs from the selected version AND all prior versions
  let versionFilter = '';
  const versionParams: any[] = [];
  if (version !== 'all') {
    const idx = VERSION_ORDER.indexOf(version as string);
    if (idx >= 0) {
      const includedVersions = VERSION_ORDER.slice(0, idx + 1);
      const placeholders = includedVersions.map(() => '?').join(',');
      versionFilter = `AND songs.version IN (${placeholders})`;
      versionParams.push(...includedVersions);
    }
  }

  // Count total MAS/ULT charts within the filtered tracklist (used for possession)
  const totalMasUlt = (db.prepare(`
    SELECT COUNT(*) as count 
    FROM charts c
    JOIN songs ON c.song_id = songs.id
    WHERE c.difficulty IN ('MAS', 'ULT')
    AND songs.${serverCol} = 1
    ${versionFilter}
  `).get(...versionParams) as any).count;

  // Determine total active songs for denominator (used for averaging percentages)
  const totalActiveSongs = (db.prepare(`
    SELECT COUNT(DISTINCT song_id) as count
    FROM charts c
    JOIN songs ON c.song_id = songs.id
    WHERE c.difficulty != 'WE' AND songs.${serverCol} = 1
    ${versionFilter}
  `).get(...versionParams) as any).count;

  // OP% = Average of (Player's best OP per song / Max OP for that song)
  const playersQuery = `
    SELECT p.username, 
           IFNULL(SUM(max_scores.max_op), 0) as total_op,
           IFNULL(ROUND((SUM(CAST(max_scores.max_op AS REAL) / song_max.max_song_op) / ?) * 100, 2), 0) as op_percent,
           IFNULL(lamp_counts.sss_count, 0) as sss_count,
           IFNULL(lamp_counts.ss_count, 0) as ss_count,
           IFNULL(lamp_counts.s_plus_count, 0) as s_plus_count,
           IFNULL(lamp_counts.s_count, 0) as s_count
    FROM players p
    LEFT JOIN (
      -- Subquery gets max OP per song per player (filtered by server/version)
      SELECT s.player_id, c.song_id, MAX(s.op) as max_op
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      JOIN songs on c.song_id = songs.id
      WHERE songs.${serverCol} = 1 ${versionFilter}
      GROUP BY s.player_id, c.song_id
    ) max_scores ON p.id = max_scores.player_id
    LEFT JOIN (
      -- Subquery gets max possible OP per song
      SELECT c.song_id, ((MAX(c.constant) * 5000 + 15000) / 5) * 5 as max_song_op
      FROM charts c
      JOIN songs on c.song_id = songs.id
      WHERE c.difficulty != 'WE' AND songs.${serverCol} = 1 ${versionFilter}
      GROUP BY c.song_id
    ) song_max ON max_scores.song_id = song_max.song_id
    LEFT JOIN (
      -- Subquery gets S/S+ counts for MAS/ULT
      SELECT 
        s.player_id,
        SUM(CASE WHEN s.score >= 1007500 THEN 1 ELSE 0 END) as sss_count,
        SUM(CASE WHEN s.score >= 1000000 THEN 1 ELSE 0 END) as ss_count,
        SUM(CASE WHEN s.score >= 990000 THEN 1 ELSE 0 END) as s_plus_count,
        SUM(CASE WHEN s.score >= 975000 THEN 1 ELSE 0 END) as s_count
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      JOIN songs on c.song_id = songs.id
      WHERE c.difficulty IN ('MAS', 'ULT') AND songs.${serverCol} = 1 ${versionFilter}
      GROUP BY s.player_id
    ) lamp_counts ON p.id = lamp_counts.player_id
    GROUP BY p.id
    HAVING total_op > 0
    ORDER BY total_op DESC
    LIMIT ? OFFSET ?
  `;
  
  const queryParams = [totalActiveSongs, ...versionParams, ...versionParams, ...versionParams, Number(limit), Number(offset)];
  const players = db.prepare(playersQuery).all(...queryParams);

  const totalPlayers = (db.prepare(`SELECT COUNT(*) as count FROM players`).get() as any).count;

  // Map to frontend expected shape
  const result = players.map((row: any) => {
    let possession = 'None';
    if (row.sss_count >= totalMasUlt && row.op_percent >= 99.5) {
      possession = 'Rainbow';
    } else if (row.ss_count >= totalMasUlt && row.op_percent >= 99) {
      possession = 'Platinum';
    } else if (row.s_plus_count >= totalMasUlt && row.op_percent >= 97.5) {
      possession = 'Gold';
    } else if (row.s_count >= totalMasUlt) {
      possession = 'Silver';
    }

    return {
      username: row.username,
      totalOp: (row.total_op || 0) / 1000,
      opPercent: row.op_percent || 0,
      possession
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
      COUNT(*) as scoreCount,
      AVG(score) as averageScore,
      SUM(CASE WHEN lamp = 'AJC' THEN 1 ELSE 0 END) as ajcCount,
      SUM(CASE WHEN lamp = 'AJ' THEN 1 ELSE 0 END) as ajCount,
      SUM(CASE WHEN lamp = 'FC' THEN 1 ELSE 0 END) as fcCount,
      SUM(CASE WHEN clear_lamp != 'FAILED' THEN 1 ELSE 0 END) as clearCount
    FROM scores
    WHERE player_id = ?
  `).get(player.id) as any;

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
  
  // Fetch all charts and attach to songs
  const charts = db.prepare(`SELECT song_id, difficulty, constant, level, note_count FROM charts`).all() as any[];
  
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
    SELECT p.username, s.score, s.lamp, s.op, s.time_achieved as timeAchieved
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
  const { conditions, bindings } = getChartFilterConditions(req.query, 'songs', 'c');
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const groupByCol = req.query.diff === 'MAS_ULT' ? 'c.constant' : 'CAST((c.constant * 2) AS INTEGER) / 2.0';

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
    JOIN charts c ON s.chart_id = c.id
    JOIN songs ON c.song_id = songs.id
    ${whereClause}
    GROUP BY ${groupByCol}, grade
  `).all(...bindings);
  res.json(data);
});

// 6. Get Aggregate Global Chart Meta (Popularity vs Average Score)
router.get('/performance/meta', (req, res) => {
  const { conditions, bindings } = getChartFilterConditions(req.query, 'so', 'c');
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
    JOIN charts c ON s.chart_id = c.id
    JOIN songs so ON c.song_id = so.id
    ${whereClause}
    GROUP BY c.id
  `).all(...bindings);
  res.json(data);
});

// 7. Get Global Server Lamp Distribution by Constant
router.get('/performance/lamps', (req, res) => {
  const { conditions, bindings } = getChartFilterConditions(req.query, 'songs', 'c');
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const groupByCol = req.query.diff === 'MAS_ULT' ? 'c.constant' : 'CAST((c.constant * 2) AS INTEGER) / 2.0';

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
    JOIN charts c ON s.chart_id = c.id
    JOIN songs ON c.song_id = songs.id
    ${whereClause}
    GROUP BY ${groupByCol}
  `).all(...bindings);
  res.json(data);
});

// 8. Get Average OP Yield by Constant
router.get('/performance/op', (req, res) => {
  const { conditions, bindings } = getChartFilterConditions(req.query, 'songs', 'c');
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const groupByCol = req.query.diff === 'MAS_ULT' ? 'c.constant' : 'CAST((c.constant * 2) AS INTEGER) / 2.0';

  const data = db.prepare(`
    SELECT 
      ${groupByCol} as constant,
      AVG(s.op * 100.0 / (c.constant * 5000 + 15000)) as avgOp,
      COUNT(s.op) as count
    FROM scores s
    JOIN charts c ON s.chart_id = c.id
    JOIN songs ON c.song_id = songs.id
    ${whereClause}
    GROUP BY ${groupByCol}
  `).all(...bindings);
  res.json(data);
});

// 9. Get Player OP Distribution (Skill Stratification)
router.get('/performance/players', (req, res) => {
  const { conditions, bindings } = getChartFilterConditions(req.query, 'songs', 'c');
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const totalActiveSongs = (db.prepare(`
    SELECT COUNT(DISTINCT song_id) as count
    FROM charts c
    JOIN songs ON c.song_id = songs.id
    ${whereClause}
  `).get(...bindings) as any).count || 1;

  const rawData = db.prepare(`
    SELECT 
      p.username,
      IFNULL(SUM(max_scores.max_op), 0) as totalOp,
      IFNULL(ROUND((SUM(CAST(max_scores.max_op AS REAL) / song_max.max_song_op) / ?) * 100, 2), 0) as opPercent
    FROM players p
    LEFT JOIN (
      SELECT s.player_id, c.song_id, MAX(s.op) as max_op
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      JOIN songs ON c.song_id = songs.id
      ${whereClause}
      GROUP BY s.player_id, c.song_id
    ) max_scores ON p.id = max_scores.player_id
    LEFT JOIN (
      SELECT c.song_id, ((MAX(c.constant) * 5000 + 15000) / 5) * 5 as max_song_op
      FROM charts c
      JOIN songs on c.song_id = songs.id
      ${whereClause}
      GROUP BY c.song_id
    ) song_max ON max_scores.song_id = song_max.song_id
    GROUP BY p.username
    HAVING totalOp > 0
    ORDER BY totalOp DESC
  `).all(totalActiveSongs, ...bindings, ...bindings) as any[];

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
import { runGlobalScrape, stopGlobalScrape, getScraperStatus } from './scraper.js';

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

router.post('/admin/sync-all', adminAuth, async (req, res) => {
  try {
    const players = db.prepare(`SELECT username FROM players`).all() as { username: string }[];
    res.json({ success: true, message: `Started background sync for ${players.length} players.` });
    
    // Background sync process
    (async () => {
      for (const p of players) {
        try {
          console.log(`[Sync-All] Syncing ${p.username}...`);
          await syncPlayer(p.username);
        } catch (e: any) {
          console.error(`[Sync-All] Failed to sync ${p.username}: ${e.message}`);
        }
      }
      console.log(`[Sync-All] Finished syncing all players.`);
    })();
    
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/scraper/start', adminAuth, (req, res) => {
  const { startId = 1, endId = 5000 } = req.body;
  runGlobalScrape(startId, endId);
  res.json({ success: true, message: `Scraper started from ID ${startId} to ${endId}` });
});

router.post('/scraper/stop', adminAuth, (req, res) => {
  stopGlobalScrape();
  res.json({ success: true, message: 'Scraper stopping.' });
});

router.get('/scraper/status', adminAuth, (req, res) => {
  res.json(getScraperStatus());
});

export default router;

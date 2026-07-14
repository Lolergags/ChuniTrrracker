import { Router } from 'express';
import db from './db.js';
import { syncPlayer } from './sync.js';

export const router = Router();

// Calculate total possible OP for a player (assumes 1,010,000 + AJC on all available charts)
// 1010000 = (const*10000 + 20000 + (1010000-1007500)*3) / 2 = (const*10000 + 27500)/2
// + 1250 AJC bonus = const*5000 + 13750 + 1250 = const*5000 + 15000
// Since OP is stored floored to nearest 5 for >= 975k
function getTotalPossibleOp() {
  const charts = db.prepare(`SELECT constant FROM charts`).all() as { constant: number }[];
  let totalRaw = 0;
  for (const chart of charts) {
    const maxOp = (chart.constant * 5000) + 15000;
    const flooredOp = Math.floor(maxOp / 5) * 5;
    totalRaw += flooredOp;
  }
  return totalRaw / 10000;
}

// 1. Import Player
router.post('/players/import', async (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Basic rate limit (5 mins)
    const player = db.prepare(`SELECT last_synced_at FROM players WHERE username = ?`).get(username) as { last_synced_at: number } | undefined;
    if (player && Date.now() - player.last_synced_at < 5 * 60 * 1000) {
      console.log(`Skipping sync for ${username} (rate limited)`);
    } else {
      await syncPlayer(username);
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error(`Failed to import player ${username}:`, err);
    res.status(500).json({ error: err.message });
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
  const totalPossibleOp = getTotalPossibleOp();

  // We need to calculate each player's Total OP = SUM(MAX(op) per song_id)
  const players = db.prepare(`
    SELECT p.username, 
           SUM(max_op) as total_op,
           ROUND((SUM(max_op) / ?) * 100, 2) as op_percent
    FROM players p
    JOIN (
      -- Subquery gets max OP per song per player
      SELECT s.player_id, c.song_id, MAX(s.op) as max_op
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      GROUP BY s.player_id, c.song_id
    ) max_scores ON p.id = max_scores.player_id
    GROUP BY p.id
    ORDER BY total_op DESC
  `).all(totalPossibleOp * 10000); // Pass in raw total possible

  // Map to frontend expected shape
  const result = players.map((row: any) => ({
    username: row.username,
    totalOp: row.total_op / 10000,
    opPercent: row.op_percent
  }));

  res.json(result);
});

// 3. Get Player Dashboard Data
router.get('/players/:username', (req, res) => {
  const { username } = req.params;
  const player = db.prepare(`SELECT id, last_synced_at FROM players WHERE username = ?`).get(username) as any;
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const totalPossibleOp = getTotalPossibleOp();

  // Get MAX OP per song to sum
  const maxOps = db.prepare(`
    SELECT c.song_id, MAX(s.op) as max_op
    FROM scores s
    JOIN charts c ON s.chart_id = c.id
    WHERE s.player_id = ?
    GROUP BY c.song_id
  `).all(player.id) as any[];

  const totalOpRaw = maxOps.reduce((sum, row) => sum + row.max_op, 0);
  const totalOp = totalOpRaw / 10000;
  const opPercent = Number(((totalOp / totalPossibleOp) * 100).toFixed(2));

  // Get other stats directly from scores
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as scoreCount,
      AVG(score) as averageScore,
      SUM(CASE WHEN lamp = 'AJC' THEN 1 ELSE 0 END) as ajcCount,
      SUM(CASE WHEN lamp = 'AJ' THEN 1 ELSE 0 END) as ajCount,
      SUM(CASE WHEN lamp = 'FC' THEN 1 ELSE 0 END) as fcCount,
      SUM(CASE WHEN lamp = 'CLEAR' THEN 1 ELSE 0 END) as clearCount
    FROM scores
    WHERE player_id = ?
  `).get(player.id) as any;

  // Get lamp distribution grouped by chart level
  const lampQuery = db.prepare(`
    SELECT 
      c.level,
      s.lamp,
      COUNT(*) as count
    FROM scores s
    JOIN charts c ON s.chart_id = c.id
    WHERE s.player_id = ?
    GROUP BY c.level, s.lamp
  `).all(player.id) as any[];

  const totalChartsQuery = db.prepare(`
    SELECT level, COUNT(*) as count
    FROM charts
    GROUP BY level
  `).all() as any[];

  const levelStats: Record<string, any> = {};
  totalChartsQuery.forEach(row => {
    levelStats[row.level] = { level: row.level, AJC: 0, AJ: 0, FC: 0, CLEAR: 0, FAILED: 0, UNPLAYED: row.count };
  });

  lampQuery.forEach(row => {
    if (levelStats[row.level]) {
      levelStats[row.level][row.lamp] = row.count;
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
  
  const scores = db.prepare(`
    SELECT 
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
    WHERE p.username = ?
    ORDER BY s.op DESC
    LIMIT ?
  `).all(username, limit);

  res.json(scores);
});

// 5. Get Songs List
router.get('/songs', (req, res) => {
  // Fetch all songs
  const songs = db.prepare(`SELECT id, title, artist, genre, jacket_url FROM songs`).all() as any[];
  
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

  const leaderboard = db.prepare(`
    SELECT p.username, s.score, s.lamp, s.op, s.time_achieved as timeAchieved
    FROM scores s
    JOIN players p ON s.player_id = p.id
    JOIN charts c ON s.chart_id = c.id
    WHERE c.song_id = ? AND c.difficulty = ?
    -- Only show the best score per player for this chart
    AND s.score = (
      SELECT MAX(s2.score)
      FROM scores s2
      WHERE s2.player_id = s.player_id AND s2.chart_id = s.chart_id
    )
    ORDER BY s.score DESC
  `).all(songId, difficulty);

  res.json(leaderboard);
});

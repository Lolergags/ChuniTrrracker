import Database from 'better-sqlite3';

const db = new Database('./data/chunitrrracker.db');

const player = db.prepare('SELECT id FROM players WHERE username = ?').get('selene693');
if (!player) {
  console.log('Player selene693 not found');
  process.exit();
}

const VERSION_ORDER = [
  'CHUNITHM', 'PLUS', 'AIR', 'AIR PLUS', 'STAR', 'STAR PLUS', 'AMAZON', 'AMAZON PLUS',
  'CRYSTAL', 'CRYSTAL PLUS', 'PARADISE', 'PARADISE LOST', 'NEW', 'NEW PLUS', 'SUN', 'SUN PLUS', 'LUMINOUS', 'LUMINOUS PLUS', 'VERSE', 'X-VERSE', 'X-VERSE-X'
];

const serverCondition = `AND (songs.is_jp_active = 1)`;

// 1. Get version totals
for (let i = 0; i < VERSION_ORDER.length; i++) {
  const v = VERSION_ORDER[i];
  const allowed = VERSION_ORDER.slice(0, i + 1);
  const p = allowed.map(() => '?').join(',');
  
  const masUlt = db.prepare(`SELECT COUNT(*) as count FROM charts c JOIN songs ON c.song_id = songs.id WHERE c.difficulty IN ('MAS', 'ULT') ${serverCondition} AND songs.version IN (${p}) AND (c.song_id NOT IN (50, 81) AND c.id != 239116)`).get(...allowed).count;
  
  const maxOpQuery = db.prepare(`
    SELECT IFNULL(SUM(((max_const * 5000 + 15000) / 5) * 5), 0) as total_op FROM (
      SELECT MAX(c.constant) as max_const
      FROM charts c
      JOIN songs ON c.song_id = songs.id
      WHERE c.difficulty != 'WE' ${serverCondition} AND songs.version IN (${p}) AND (c.song_id NOT IN (50, 81) AND c.id != 239116)
      GROUP BY c.song_id
    )
  `).get(...allowed);
  
  const activeSongs = db.prepare(`SELECT COUNT(DISTINCT song_id) as count FROM charts c JOIN songs ON c.song_id = songs.id WHERE c.difficulty != 'WE' ${serverCondition} AND songs.version IN (${p}) AND (c.song_id NOT IN (50, 81) AND c.id != 239116)`).get(...allowed).count;
  
  // 2. Get player stats up to this version
  const playerScores = db.prepare(`
    SELECT songs.version, MAX(s.op) as max_op
    FROM scores s
    JOIN charts c ON s.chart_id = c.id
    JOIN songs ON c.song_id = songs.id
    WHERE s.player_id = ? AND c.difficulty != 'WE' AND (c.song_id NOT IN (50, 81) AND c.id != 239116) ${serverCondition} AND songs.version IN (${p})
    GROUP BY c.song_id
  `).all(player.id, ...allowed);
  
  let playerOp = playerScores.reduce((sum, row) => sum + row.max_op, 0);
  let opPercent = activeSongs > 0 ? (playerOp / maxOpQuery.total_op) * 100 : 0;
  
  const playerMasUlt = db.prepare(`
    SELECT COUNT(*) as count
    FROM scores s
    JOIN charts c ON s.chart_id = c.id
    JOIN songs ON c.song_id = songs.id
    WHERE s.player_id = ? AND c.difficulty IN ('MAS', 'ULT') AND s.score >= 1007500 AND (c.song_id NOT IN (50, 81) AND c.id != 239116) ${serverCondition} AND songs.version IN (${p})
  `).get(player.id, ...allowed).count;
  
  console.log(`Version: ${v} | MAS/ULT Denom: ${masUlt} | Player SSS: ${playerMasUlt} | OP%: ${opPercent.toFixed(2)}%`);
  
  if (playerMasUlt >= masUlt && opPercent >= 99.5) {
      console.log(`>>> RAINBOW ACHIEVED ON ${v}!`);
  }
}

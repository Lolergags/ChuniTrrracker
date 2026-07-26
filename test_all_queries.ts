import db from './server/db.js';
import { getChartFilterConditions, CHRONOLOGICAL_VERSIONS } from './server/utils/filters.js';

console.log('Testing DB initialization and migrations...');

try {
  // Check charts table columns
  const tableInfo = db.prepare(`PRAGMA table_info(charts)`).all() as any[];
  console.log('Charts table columns:', tableInfo.map(c => c.name));

  const hasVersion = tableInfo.some(c => c.name === 'version');
  if (!hasVersion) {
    console.error('FATAL: charts table IS MISSING version column!');
  } else {
    console.log('SUCCESS: charts table HAS version column.');
  }

  // Prepare all queries from routes.ts
  console.log('\nPreparing all route SQL queries to detect syntax or column errors...');

  const serverCondition = 'AND songs.is_jp_active = 1';
  const includedVersions = ['CHUNITHM', 'AIR', 'X-VERSE-X'];
  const placeholders = includedVersions.map(() => '?').join(',');
  const versionFilter = `AND c.version IN (${placeholders})`;

  db.prepare(`
    SELECT IFNULL(SUM(song_max_op), 0) as total_max_op FROM (
      SELECT ((MAX(c.constant) * 5000 + 15000) / 5) * 5 as song_max_op
      FROM charts c
      JOIN songs ON c.song_id = songs.id
      WHERE c.difficulty != 'WE' AND (c.song_id NOT IN (50, 81) AND c.id != 239116) ${serverCondition}
      ${versionFilter}
      GROUP BY c.song_id
    )
  `);

  db.prepare(`
    SELECT p.id, p.username, 
           IFNULL(SUM(max_scores.max_op), 0) as total_op,
           IFNULL(ROUND(CAST(SUM(max_scores.max_op) AS REAL) / ? * 100, 2), 0) as op_percent
    FROM players p
    LEFT JOIN (
      SELECT s.player_id, c.song_id, MAX(s.op) as max_op
      FROM scores s
      JOIN charts c ON s.chart_id = c.id
      JOIN songs on c.song_id = songs.id
      WHERE c.difficulty != 'WE' AND (c.song_id NOT IN (50, 81) AND c.id != 239116) ${serverCondition} ${versionFilter}
      GROUP BY s.player_id, c.song_id
    ) max_scores ON p.id = max_scores.player_id
    GROUP BY p.id
    HAVING total_op > 0
    ORDER BY total_op DESC
    LIMIT ? OFFSET ?
  `);

  db.prepare(`SELECT COUNT(DISTINCT s.player_id) as count FROM scores s JOIN charts c ON s.chart_id = c.id JOIN songs ON c.song_id = songs.id WHERE 1=1 ${serverCondition} ${versionFilter}`);

  db.prepare(`SELECT COUNT(*) as count FROM charts c JOIN songs ON c.song_id = songs.id WHERE c.difficulty IN ('MAS', 'ULT') ${serverCondition} AND c.version IN (${placeholders}) AND (c.song_id NOT IN (50, 81) AND c.id != 239116)`);

  db.prepare(`
    SELECT 
      SUM(CASE WHEN s.score >= 1007500 THEN 1 ELSE 0 END) as sss,
      SUM(CASE WHEN s.score >= 1000000 THEN 1 ELSE 0 END) as ss,
      SUM(CASE WHEN s.score >= 990000 THEN 1 ELSE 0 END) as sPlus,
      SUM(CASE WHEN s.score >= 975000 THEN 1 ELSE 0 END) as s
    FROM scores s
    JOIN charts c ON s.chart_id = c.id
    JOIN songs ON c.song_id = songs.id
    WHERE s.player_id = ? AND c.difficulty IN ('MAS', 'ULT') AND c.version IN (${placeholders}) AND (c.song_id NOT IN (50, 81) AND c.id != 239116) ${serverCondition}
  `);

  // Test getChartFilterConditions queries
  const reqQuery = { version: 'AIR', server: 'JP' };
  
  const f1 = getChartFilterConditions(reqQuery, 'songs', 'c');
  db.prepare(`SELECT * FROM charts c JOIN songs ON c.song_id = songs.id WHERE ${f1.conditions.join(' AND ')}`);

  const f2 = getChartFilterConditions(reqQuery, 'so', 'c');
  db.prepare(`SELECT * FROM scores s JOIN charts c ON s.chart_id = c.id JOIN songs so ON c.song_id = so.id WHERE ${f2.conditions.join(' AND ')}`);

  const f3 = getChartFilterConditions(reqQuery, 'songs', 'c', 'p');
  db.prepare(`SELECT * FROM scores s JOIN players p ON s.player_id = p.id JOIN charts c ON s.chart_id = c.id JOIN songs ON c.song_id = songs.id WHERE ${f3.conditions.join(' AND ')}`);

  console.log('All query tests PASSED successfully!');

} catch (err: any) {
  console.error('DETECTED ERROR:', err);
}

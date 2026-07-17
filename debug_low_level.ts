import db from './server/db.ts';

const result = db.prepare(`
  SELECT s.id as songId, s.title, c.difficulty, c.level, c.constant 
  FROM charts c 
  JOIN songs s ON c.song_id = s.id 
  WHERE CAST(c.level AS INTEGER) <= 5 AND c.difficulty IN ('MAS', 'ULT')
`).all();

console.log(result);

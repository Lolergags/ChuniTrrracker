import fs from 'fs';

let content = fs.readFileSync('check_possession.js', 'utf8');
content = content.replace(/c\.id NOT IN \(95, 201, 239116\)/g, "(c.song_id NOT IN (50, 81) AND c.id != 239116)");
fs.writeFileSync('check_possession.js', content);


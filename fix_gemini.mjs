import fs from 'fs';

let content = fs.readFileSync('GEMINI.md', 'utf8');
content = content.replace(/c\.id NOT IN \(95, 201, 239116\)/g, "(c.song_id NOT IN (50, 81) AND c.id != 239116)");
content = content.replace(/chart\.id 95, 201, 239116/g, "song_id 50, 81 and manually inserted chart.id 239116");
fs.writeFileSync('GEMINI.md', content);


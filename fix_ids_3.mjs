import fs from 'fs';

let content = fs.readFileSync('server/routes.ts', 'utf8');
content = content.replace(/id NOT IN \(95, 201\)/g, "(song_id NOT IN (50, 81) AND id != 239116)");
fs.writeFileSync('server/routes.ts', content);


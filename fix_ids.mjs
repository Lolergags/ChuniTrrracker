import fs from 'fs';

let content = fs.readFileSync('server/routes.ts', 'utf8');
content = content.replace(/c\.id NOT IN \(95, 201, 239116\)/g, "(c.song_id NOT IN (50, 81) AND c.id != 239116)");
content = content.replace(/c2\.id NOT IN \(95, 201, 239116\)/g, "(c2.song_id NOT IN (50, 81) AND c2.id != 239116)");
fs.writeFileSync('server/routes.ts', content);

let filters = fs.readFileSync('server/utils/filters.ts', 'utf8');
filters = filters.replace(/chartsAlias}\.id NOT IN \(95, 201, 239116\)/g, "chartsAlias}.song_id NOT IN (50, 81) AND ${chartsAlias}.id != 239116");
fs.writeFileSync('server/utils/filters.ts', filters);

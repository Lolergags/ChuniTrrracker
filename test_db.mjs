import Database from 'better-sqlite3';
const db = new Database('./data/chunitrrracker.db');

const rows = db.prepare(`SELECT * FROM charts WHERE song_id = 0`).all();
console.log(rows);

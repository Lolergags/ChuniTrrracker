import sqlite3

conn = sqlite3.connect('data/chunitrrracker.db')
c = conn.cursor()
c.execute("SELECT COUNT(*) FROM players")
print("Players:", c.fetchone()[0])
c.execute("SELECT COUNT(*) FROM scores")
print("Scores:", c.fetchone()[0])
c.execute("SELECT username, id FROM players")
for row in c.fetchall():
    print(f"Player: {row[0]}")
    c.execute("SELECT COUNT(*) FROM scores WHERE player_id=?", (row[1],))
    print(f"  Scores: {c.fetchone()[0]}")

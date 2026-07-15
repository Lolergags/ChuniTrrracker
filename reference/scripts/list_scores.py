import sqlite3

conn = sqlite3.connect('data/chunitrrracker.db')
c = conn.cursor()
c.execute("SELECT p.username, COUNT(s.id) FROM players p LEFT JOIN scores s ON p.id = s.player_id GROUP BY p.username")
for row in c.fetchall():
    print(row)

import sqlite3

conn = sqlite3.connect('data/chunitrrracker.db')
c = conn.cursor()
c.execute("SELECT id, username FROM players")
for row in c.fetchall():
    print(row)

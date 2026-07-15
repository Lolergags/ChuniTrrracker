import sqlite3

conn = sqlite3.connect('data/chunitrrracker.db')
c = conn.cursor()
c.execute("DROP TABLE IF EXISTS scores")
conn.commit()
print("Dropped scores table")

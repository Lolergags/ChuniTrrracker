import sqlite3

conn = sqlite3.connect('data/chunitrrracker.db')
c = conn.cursor()

c.execute("DELETE FROM players WHERE username NOT IN ('Bryk', 'Lolergags', 'tsuki')")
deleted = c.rowcount
conn.commit()

print(f"Deleted {deleted} mock players.")

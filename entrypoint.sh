#!/bin/sh

# Container entrypoint script with automatic supervisor loop.
# When the server process exits (e.g. after applying an update via Update Manager),
# this loop catches the exit and immediately restarts the updated server process.

echo "[ChuniTrrracker] Starting application supervisor..."

cd /app || exit 1

while true; do
  echo "[ChuniTrrracker] Starting server process..."
  npx tsx server/index.ts
  EXIT_CODE=$?
  echo "[ChuniTrrracker] Server process exited with code ${EXIT_CODE}. Restarting in 2 seconds..."
  sleep 2
done

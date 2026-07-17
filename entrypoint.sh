#!/bin/bash
set -e

# If /app is empty or doesn't have a .git folder, clone the repo
if [ ! -d "/app/.git" ]; then
  echo "Initial startup: Cloning ChuniTrrracker repository into /app..."
  # Clean directory just in case it has lost+found or other hidden files
  rm -rf /app/* /app/.* 2>/dev/null || true
  git clone https://github.com/Lolergags/ChuniTrrracker.git /app
fi

cd /app

# Ensure we have the right permissions
mkdir -p /app/server/data

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Starting ChuniTrrracker Server..."
exec npx tsx server/index.ts

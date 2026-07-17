#!/bin/bash
set -e

# If /app is empty or doesn't have a .git folder, clone the repo
if [ ! -d "/app/.git" ]; then
  echo "Initial startup: Cloning ChuniTrrracker repository into /app..."
  git clone https://github.com/Lolergags/ChuniTrrracker.git /tmp/repo
  cp -a /tmp/repo/. /app/
  rm -rf /tmp/repo
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

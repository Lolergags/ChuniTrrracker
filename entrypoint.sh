#!/bin/bash
set -e

cd /app

# If the directory doesn't have a .git folder, pull the repo
if [ ! -d ".git" ]; then
  echo "Initial startup: Cloning ChuniTrrracker repository into /app..."

  # Initialize an empty git repo, link it, and force-pull the main branch
  git init
  git remote add origin https://github.com/Lolergags/ChuniTrrracker.git
  git fetch
  git reset --hard origin/main
fi

# Ensure we have the right permissions
mkdir -p /app/server/data

echo "Installing dependencies..."
npm install

echo "Building frontend..."
npm run build

echo "Starting ChuniTrrracker Server..."
exec npx tsx server/index.ts

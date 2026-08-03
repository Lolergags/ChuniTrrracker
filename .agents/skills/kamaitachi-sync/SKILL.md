---
name: kamaitachi-sync
description: Runbook for auditing, debugging, and verifying Kamaitachi API data syncs, rate limits, and ghost chart exclusions.
---

# Kamaitachi Data Sync & Scraper Auditor

Use this skill when implementing, debugging, or testing score synchronization routines with the Kamaitachi API (`https://kamai.tachi.ac/api/v1`).

## Protocol Checklist

### 1. API Route Pathing
* Chunithm is a single-playtype game. Verify all Kamaitachi routes drop the `/Single` segment.
* Correct endpoint: `/games/chunithm/pbs/all` (Personal Bests).
* Player profile endpoint: `/users/{id}/games/chunithm` (rating path: `body.gameStats.ratings.naiveRating`).

### 2. Rate-Limit Safety Verification
* Inspect looping logic in `server/sync.ts` or background tasks.
* **Mandatory**: Ensure every external API request loop includes a minimum `1.5-second (1500ms)` delay between iterations (`await new Promise(r => setTimeout(r, 1500))`).

### 3. Ghost Chart & Denominator Filtering
* Verify that ghost/unmapped charts (`song_id IN (50, 81)` and `chart.id = 239116`) are strictly blacklisted in all score/completion denominator queries.
* Ensure data mapping links Kamaitachi `chart.data.inGameID` to local integer `songs.id` (never match by `title` due to duplicate song titles in Chunithm).

### 4. Cache Invalidation
* Verify that `clearAllCaches()` from `server/utils/cache.ts` is invoked immediately upon completing a score import to invalidate stale Leaderboard, Dashboard, and Analytics cache keys.

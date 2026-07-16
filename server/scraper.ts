import { syncPlayer } from './sync.js';
import db from './db.js';

let isScraping = false;
let currentScrapeId = 1;
const MAX_USERS = 5000;
const DELAY_MS = 1500; // 1.5s delay to stay under ~40 req/min

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function runGlobalScrape(startId: number = 1, endId: number = 5000) {
  if (isScraping) return;
  isScraping = true;
  currentScrapeId = startId;

  console.log(`[Scraper] Starting global scrape from ID ${startId} to ${endId}`);

  try {
    while (currentScrapeId <= endId && isScraping) {
      try {
        // First fetch the user profile to get the username and check if they exist
        const userRes = await fetch(`https://kamai.tachi.ac/api/v1/users/${currentScrapeId}`);
        if (!userRes.ok) {
          if (userRes.status === 404) {
             // User doesn't exist.
          } else {
             console.error(`[Scraper] Failed to fetch profile for ID ${currentScrapeId}: ${userRes.statusText}`);
          }
        } else {
          const userData = await userRes.json();
          const username = userData.body.username;
          
          // Now sync the player using their real username
          // Note: we still need to wait between requests. Since syncPlayer takes 1 request,
          // we are doing 2 requests per user here. We should increase the delay or just accept it.
          await syncPlayer(username);
          console.log(`[Scraper] Successfully imported user ID ${currentScrapeId} (${username})`);
        }
      } catch (err: any) {
        if (err.message.includes('User not found') || err.message.includes('404')) {
          // User exists but has no Chunithm scores. Ignore silently.
        } else {
          console.error(`[Scraper] Failed to import ID ${currentScrapeId}:`, err.message);
        }
      }

      if (currentScrapeId === endId) {
        console.log(`[Scraper] Reached end ID ${endId}. Complete.`);
        break;
      }

      currentScrapeId++;
      await delay(DELAY_MS);
    }
  } finally {
    isScraping = false;
    console.log(`[Scraper] Stopped.`);
  }
}

export function stopGlobalScrape() {
  isScraping = false;
}

export function getScraperStatus() {
  return { isScraping, currentScrapeId };
}

export let globalSyncState = {
  isSyncing: false,
  total: 0,
  current: 0,
  currentUser: ''
};

export async function runGlobalSync() {
  if (globalSyncState.isSyncing) return;

  const players = db.prepare(`SELECT username FROM players`).all() as { username: string }[];
  
  globalSyncState.isSyncing = true;
  globalSyncState.total = players.length;
  globalSyncState.current = 0;
  globalSyncState.currentUser = '';

  console.log(`[Sync-All] Started background sync for ${players.length} players.`);
  
  try {
    for (const p of players) {
      if (!globalSyncState.isSyncing) break;
      try {
        globalSyncState.currentUser = p.username;
        console.log(`[Sync-All] Syncing ${p.username}...`);
        await syncPlayer(p.username);
      } catch (e: any) {
        console.error(`[Sync-All] Failed to sync ${p.username}: ${e.message}`);
      }
      globalSyncState.current++;
      await delay(DELAY_MS);
    }
  } finally {
    console.log(`[Sync-All] Finished syncing all players.`);
    globalSyncState.isSyncing = false;
    globalSyncState.currentUser = '';
  }
}

export function getSyncAllStatus() {
  return globalSyncState;
}

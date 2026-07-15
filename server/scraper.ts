import { syncPlayer } from './sync.js';
import { db } from './db.js';

let isScraping = false;
let currentScrapeId = 1;
const MAX_USERS = 5000;
const DELAY_MS = 1500; // 1.5s delay to stay under ~40 req/min

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function runGlobalScrape(startId: number = 1, testMode: boolean = false) {
  if (isScraping) return;
  isScraping = true;
  currentScrapeId = startId;

  console.log(`[Scraper] Starting global scrape from ID ${startId} ${testMode ? '(Test Mode)' : ''}`);

  try {
    while (currentScrapeId <= MAX_USERS && isScraping) {
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

      if (testMode && currentScrapeId === startId + 3) {
        console.log(`[Scraper] Test mode complete (4 users processed).`);
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

import { runGlobalScrape, runGlobalSync, getScraperStatus, getSyncAllStatus } from './scraper.js';

// 12 hours for Sync, 24 hours for Scrape
const SYNC_INTERVAL_MS = 12 * 60 * 60 * 1000;
const SCRAPE_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function initScheduler() {
  console.log('[Scheduler] Initializing background tasks...');
  
  // Periodic Resync
  setInterval(async () => {
    const scrapeStatus = getScraperStatus();
    const syncStatus = getSyncAllStatus();
    if (scrapeStatus.isScraping || syncStatus.isSyncing) {
      console.log('[Scheduler] Skipping scheduled Global Sync because another task is running.');
      return;
    }
    console.log('[Scheduler] Triggering scheduled Global Sync.');
    runGlobalSync().catch(err => console.error('[Scheduler] Global Sync Error:', err));
  }, SYNC_INTERVAL_MS);

  // Periodic Scrape
  setInterval(async () => {
    const scrapeStatus = getScraperStatus();
    const syncStatus = getSyncAllStatus();
    if (scrapeStatus.isScraping || syncStatus.isSyncing) {
      console.log('[Scheduler] Skipping scheduled Global Scrape because another task is running.');
      return;
    }
    console.log('[Scheduler] Triggering scheduled Global Scrape (Max 5000 users).');
    runGlobalScrape(1, 5000).catch(err => console.error('[Scheduler] Global Scrape Error:', err));
  }, SCRAPE_INTERVAL_MS);
}

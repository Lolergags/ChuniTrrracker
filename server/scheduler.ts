import { runGlobalScrape, runGlobalSync, getScraperStatus, getSyncAllStatus } from './scraper.js';

let syncIntervalId: ReturnType<typeof setInterval> | null = null;
let scrapeIntervalId: ReturnType<typeof setInterval> | null = null;

let isSchedulerEnabled = false;
let syncIntervalMs = 12 * 60 * 60 * 1000; // 12 hours
let scrapeIntervalMs = 24 * 60 * 60 * 1000; // 24 hours
let nextSyncTime: number | null = null;
let nextScrapeTime: number | null = null;

export function getSchedulerStatus() {
  return {
    isEnabled: isSchedulerEnabled,
    syncIntervalMs,
    scrapeIntervalMs,
    nextSyncTime,
    nextScrapeTime,
  };
}

export function startScheduler(syncMs?: number, scrapeMs?: number) {
  if (syncMs) syncIntervalMs = syncMs;
  if (scrapeMs) scrapeIntervalMs = scrapeMs;

  stopScheduler(); // clear old intervals
  isSchedulerEnabled = true;
  console.log('[Scheduler] Starting background tasks...');

  // Setup Sync
  nextSyncTime = Date.now() + syncIntervalMs;
  syncIntervalId = setInterval(() => {
    nextSyncTime = Date.now() + syncIntervalMs; // update next run time
    
    const scrapeStatus = getScraperStatus();
    const syncStatus = getSyncAllStatus();
    if (scrapeStatus.isScraping || syncStatus.isSyncing) {
      console.log('[Scheduler] Skipping scheduled Global Sync because another task is running.');
      return;
    }
    console.log('[Scheduler] Triggering scheduled Global Sync.');
    runGlobalSync().catch(err => console.error('[Scheduler] Global Sync Error:', err));
  }, syncIntervalMs);

  // Setup Scrape
  nextScrapeTime = Date.now() + scrapeIntervalMs;
  scrapeIntervalId = setInterval(() => {
    nextScrapeTime = Date.now() + scrapeIntervalMs; // update next run time
    
    const scrapeStatus = getScraperStatus();
    const syncStatus = getSyncAllStatus();
    if (scrapeStatus.isScraping || syncStatus.isSyncing) {
      console.log('[Scheduler] Skipping scheduled Global Scrape because another task is running.');
      return;
    }
    console.log('[Scheduler] Triggering scheduled Global Scrape (Max 5000 users).');
    runGlobalScrape(1, 5000).catch(err => console.error('[Scheduler] Global Scrape Error:', err));
  }, scrapeIntervalMs);
}

export function stopScheduler() {
  if (syncIntervalId) clearInterval(syncIntervalId);
  if (scrapeIntervalId) clearInterval(scrapeIntervalId);
  syncIntervalId = null;
  scrapeIntervalId = null;
  nextSyncTime = null;
  nextScrapeTime = null;
  isSchedulerEnabled = false;
  console.log('[Scheduler] Stopped.');
}

export function initScheduler() {
  startScheduler();
}

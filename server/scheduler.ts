import cron from 'node-cron';
import parser from 'cron-parser';
import { runGlobalScrape, runGlobalSync, getScraperStatus, getSyncAllStatus } from './scraper.js';

let syncTask: cron.ScheduledTask | null = null;
let scrapeTask: cron.ScheduledTask | null = null;

let isSchedulerEnabled = false;
let syncCronString = '0 12 * * *'; // Default: every day at 12:00 PM
let scrapeCronString = '0 0 * * *'; // Default: every day at 12:00 AM
let scrapeStartId = 1;
let scrapeEndId = 5000;

export function updateScrapeBounds(lastValidId: number) {
  scrapeStartId = lastValidId;
  scrapeEndId = Math.max(scrapeEndId, scrapeStartId + 1000);
  console.log(`[Scheduler] Scrape bounds updated: ${scrapeStartId} to ${scrapeEndId}`);
}

function getNextDate(cronString: string) {
  try {
    let interval;
    const cp = parser as any;
    if (typeof cp.parseExpression === 'function') {
      interval = cp.parseExpression(cronString);
    } else if (typeof cp.parse === 'function') {
      interval = cp.parse(cronString);
    } else if (typeof cp.default?.parseExpression === 'function') {
      interval = cp.default.parseExpression(cronString);
    } else {
      throw new Error("Could not find parse method on cron-parser");
    }
    return interval.next().getTime();
  } catch (e) {
    console.error("Cron parser error:", e);
    return null;
  }
}

export function getSchedulerStatus() {
  return {
    isEnabled: isSchedulerEnabled,
    syncCronString,
    scrapeCronString,
    scrapeStartId,
    scrapeEndId,
    nextSyncTime: getNextDate(syncCronString),
    nextScrapeTime: getNextDate(scrapeCronString),
  };
}

export function startScheduler(syncCron?: string, scrapeCron?: string, startId?: number, endId?: number) {
  if (syncCron) syncCronString = syncCron;
  if (scrapeCron) scrapeCronString = scrapeCron;
  if (startId) scrapeStartId = startId;
  if (endId) scrapeEndId = endId;

  stopScheduler(); // clear old tasks
  isSchedulerEnabled = true;
  console.log('[Scheduler] Starting background cron tasks...');

  // Setup Sync
  syncTask = cron.schedule(syncCronString, () => {
    const scrapeStatus = getScraperStatus();
    const syncStatus = getSyncAllStatus();
    if (scrapeStatus.isScraping || syncStatus.isSyncing) {
      console.log('[Scheduler] Skipping scheduled Global Sync because another task is running.');
      return;
    }
    console.log('[Scheduler] Triggering scheduled Global Sync.');
    runGlobalSync().catch(err => console.error('[Scheduler] Global Sync Error:', err));
  });

  // Setup Scrape
  scrapeTask = cron.schedule(scrapeCronString, () => {
    const scrapeStatus = getScraperStatus();
    const syncStatus = getSyncAllStatus();
    if (scrapeStatus.isScraping || syncStatus.isSyncing) {
      console.log('[Scheduler] Skipping scheduled Global Scrape because another task is running.');
      return;
    }
    console.log(`[Scheduler] Triggering scheduled Global Scrape (${scrapeStartId} to ${scrapeEndId}).`);
    runGlobalScrape(scrapeStartId, scrapeEndId)
      .then((lastValidId) => {
        if (lastValidId !== undefined) {
          updateScrapeBounds(lastValidId);
        }
      })
      .catch(err => console.error('[Scheduler] Global Scrape Error:', err));
  });
}

export function stopScheduler() {
  if (syncTask) syncTask.stop();
  if (scrapeTask) scrapeTask.stop();
  syncTask = null;
  scrapeTask = null;
  isSchedulerEnabled = false;
  console.log('[Scheduler] Stopped.');
}

export function initScheduler() {
  startScheduler();
}

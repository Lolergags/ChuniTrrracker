import cron from 'node-cron';
import parser from 'cron-parser';
import { runGlobalScrape, runGlobalSync, getScraperStatus, getSyncAllStatus } from './scraper.js';

import db from './db.js';

function saveConfig(key: string, value: string) {
  try {
    db.prepare(`INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(key, value);
  } catch (e) {
    console.error(`Failed to save config ${key}:`, e);
  }
}

function loadConfig(key: string, defaultValue: string) {
  try {
    const row = db.prepare(`SELECT value FROM config WHERE key = ?`).get(key) as any;
    return row ? row.value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

let syncTask: cron.ScheduledTask | null = null;
let scrapeTask: cron.ScheduledTask | null = null;

let isSchedulerEnabled = loadConfig('isSchedulerEnabled', '0') === '1';
let syncCronString = loadConfig('syncCronString', '0 12 * * *');
let scrapeCronString = loadConfig('scrapeCronString', '0 0 * * *');
let scrapeStartId = parseInt(loadConfig('scrapeStartId', '1')) || 1;
let scrapeEndId = parseInt(loadConfig('scrapeEndId', '5000')) || 5000;

export function updateScrapeBounds(lastValidId: number) {
  scrapeStartId = lastValidId;
  scrapeEndId = Math.max(scrapeEndId, scrapeStartId + 1000);
  saveConfig('scrapeStartId', scrapeStartId.toString());
  saveConfig('scrapeEndId', scrapeEndId.toString());
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
    } else if (cp.CronExpressionParser && typeof cp.CronExpressionParser.parse === 'function') {
      interval = cp.CronExpressionParser.parse(cronString);
    } else if (typeof cp.default?.parseExpression === 'function') {
      interval = cp.default.parseExpression(cronString);
    } else if (typeof cp.default?.parse === 'function') {
      interval = cp.default.parse(cronString);
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
  if (syncCron) { syncCronString = syncCron; saveConfig('syncCronString', syncCron); }
  if (scrapeCron) { scrapeCronString = scrapeCron; saveConfig('scrapeCronString', scrapeCron); }
  if (startId) { scrapeStartId = startId; saveConfig('scrapeStartId', startId.toString()); }
  if (endId) { scrapeEndId = endId; saveConfig('scrapeEndId', endId.toString()); }

  stopScheduler(); // clear old tasks
  isSchedulerEnabled = true;
  saveConfig('isSchedulerEnabled', '1');
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
  isSchedulerEnabled = false;
  saveConfig('isSchedulerEnabled', '0');
  
  if (syncTask) syncTask.stop();
  if (scrapeTask) scrapeTask.stop();
  syncTask = null;
  scrapeTask = null;
  console.log('[Scheduler] Stopped.');
}

export function initScheduler() {
  if (isSchedulerEnabled) {
    startScheduler();
  }
}

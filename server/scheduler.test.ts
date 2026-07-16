import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSchedulerStatus, startScheduler, stopScheduler, updateScrapeBounds } from './scheduler.js';

// Mock the SQLite database to intercept config queries
const mockDbStore: Record<string, string> = {};

vi.mock('./db.js', () => {
  return {
    default: {
      prepare: (query: string) => ({
        run: (key: string, value: string) => {
          if (query.includes('INSERT INTO config')) {
            mockDbStore[key] = value;
          }
        },
        get: (key: string) => {
          if (query.includes('SELECT value FROM config')) {
            return mockDbStore[key] !== undefined ? { value: mockDbStore[key] } : undefined;
          }
          return undefined;
        }
      })
    }
  };
});

describe('Scheduler & DB Persistence', () => {
  beforeEach(() => {
    // Reset mock store
    for (const key in mockDbStore) {
      delete mockDbStore[key];
    }
    stopScheduler();
  });

  afterEach(() => {
    stopScheduler();
  });

  it('should initialize with default values if DB is empty', () => {
    const status = getSchedulerStatus();
    expect(status.syncCronString).toBe('0 12 * * *');
    expect(status.scrapeCronString).toBe('0 0 * * *');
    expect(status.scrapeStartId).toBe(1);
    expect(status.scrapeEndId).toBe(5000);
  });

  it('should persist configuration to the DB on startScheduler', () => {
    startScheduler('30 */6 * * *', '0 3 * * *', 1500, 2500);
    
    // Verify values were written to mock DB
    expect(mockDbStore['syncCronString']).toBe('30 */6 * * *');
    expect(mockDbStore['scrapeCronString']).toBe('0 3 * * *');
    expect(mockDbStore['scrapeStartId']).toBe('1500');
    expect(mockDbStore['scrapeEndId']).toBe('2500');
    expect(mockDbStore['isSchedulerEnabled']).toBe('1');
    
    // Verify getSchedulerStatus returns updated values
    const status = getSchedulerStatus();
    expect(status.syncCronString).toBe('30 */6 * * *');
    expect(status.scrapeCronString).toBe('0 3 * * *');
    expect(status.isEnabled).toBe(true);
  });

  it('should automatically shift scrape bounds on updateScrapeBounds and persist', () => {
    // Start with arbitrary IDs
    startScheduler('0 12 * * *', '0 0 * * *', 100, 1100);
    
    // Simulate scraper finishing at ID 500
    updateScrapeBounds(500);
    
    // Verify boundaries updated correctly in memory
    const status = getSchedulerStatus();
    expect(status.scrapeStartId).toBe(500);
    expect(status.scrapeEndId).toBe(1500); // 500 + 1000 = 1500
    
    // Verify boundaries persisted to DB
    expect(mockDbStore['scrapeStartId']).toBe('500');
    expect(mockDbStore['scrapeEndId']).toBe('1500');
  });

  it('should stop the scheduler and persist the disabled state', () => {
    startScheduler();
    expect(mockDbStore['isSchedulerEnabled']).toBe('1');
    expect(getSchedulerStatus().isEnabled).toBe(true);
    
    stopScheduler();
    expect(mockDbStore['isSchedulerEnabled']).toBe('0');
    expect(getSchedulerStatus().isEnabled).toBe(false);
  });
});

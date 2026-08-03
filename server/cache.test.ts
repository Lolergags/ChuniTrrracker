import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCache,
  setCache,
  clearAllCaches,
  normalizeQueryCacheKey,
  getTotalMaxOp,
  setTotalMaxOp,
  getLeaderboardCache,
  setLeaderboardCache,
  clearLeaderboardCache
} from './utils/cache.js';

describe('Server Response Cache Utility', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('getCache & setCache', () => {
    it('should store and retrieve cached data', () => {
      setCache('test_key', { foo: 'bar' });
      const cached = getCache<{ foo: string }>('test_key');
      expect(cached).toEqual({ foo: 'bar' });
    });

    it('should return null for non-existent keys', () => {
      const cached = getCache('non_existent');
      expect(cached).toBeNull();
    });

    it('should expire cached entries after TTL (15 minutes)', () => {
      vi.useFakeTimers();
      setCache('ttl_key', { data: 123 });
      
      // Right before 15 min TTL
      vi.advanceTimersByTime(14 * 60 * 1000);
      expect(getCache('ttl_key')).toEqual({ data: 123 });

      // Exceed 15 min TTL
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(getCache('ttl_key')).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('getTotalMaxOp & setTotalMaxOp', () => {
    it('should store and retrieve totalMaxOp values', () => {
      setTotalMaxOp('jp_all', 1234567);
      expect(getTotalMaxOp('jp_all')).toBe(1234567);
    });

    it('should return null for missing totalMaxOp keys', () => {
      expect(getTotalMaxOp('missing_key')).toBeNull();
    });

    it('should expire totalMaxOp entries after 30 minutes TTL', () => {
      vi.useFakeTimers();
      setTotalMaxOp('max_op_ttl', 999999);

      // Advance 29 minutes
      vi.advanceTimersByTime(29 * 60 * 1000);
      expect(getTotalMaxOp('max_op_ttl')).toBe(999999);

      // Exceed 30 minutes
      vi.advanceTimersByTime(2 * 60 * 1000);
      expect(getTotalMaxOp('max_op_ttl')).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('normalizeQueryCacheKey', () => {
    it('should normalize server parameter to lowercase', () => {
      const key1 = normalizeQueryCacheKey('leaderboard', { server: 'JP', version: 'NEW' });
      const key2 = normalizeQueryCacheKey('leaderboard', { server: 'jp', version: 'NEW' });
      expect(key1).toBe(key2);
    });

    it('should produce identical keys regardless of query object key insertion order', () => {
      const key1 = normalizeQueryCacheKey('stats', { version: 'SUN', server: 'INT', page: '1' });
      const key2 = normalizeQueryCacheKey('stats', { page: '1', server: 'int', version: 'SUN' });
      expect(key1).toBe(key2);
    });
  });

  describe('clearAllCaches', () => {
    it('should clear both server response cache and totalMaxOp cache', () => {
      setCache('resp_1', 'data1');
      setTotalMaxOp('op_1', 500);

      clearAllCaches();

      expect(getCache('resp_1')).toBeNull();
      expect(getTotalMaxOp('op_1')).toBeNull();
    });
  });

  describe('Leaderboard cache aliases', () => {
    it('should support getLeaderboardCache, setLeaderboardCache, and clearLeaderboardCache', () => {
      setLeaderboardCache('lb_1', [1, 2, 3]);
      expect(getLeaderboardCache('lb_1')).toEqual([1, 2, 3]);

      clearLeaderboardCache();
      expect(getLeaderboardCache('lb_1')).toBeNull();
    });
  });
});

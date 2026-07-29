// In-memory cache manager for server responses (Leaderboard & Global Performance Stats)
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

const serverCache = new Map<string, CacheEntry>();

// Cache TTL: 15 minutes (also invalidated automatically on score sync)
const CACHE_TTL_MS = 15 * 60 * 1000;

export function getCache<T = any>(key: string): T | null {
  const entry = serverCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    serverCache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

export function setCache<T = any>(key: string, data: T): void {
  serverCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export function clearAllCaches(): void {
  serverCache.clear();
}

// Backward compatibility helpers
export const getLeaderboardCache = getCache;
export const setLeaderboardCache = setCache;
export const clearLeaderboardCache = clearAllCaches;

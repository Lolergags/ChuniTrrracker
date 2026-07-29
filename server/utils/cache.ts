// In-memory cache manager for server responses (e.g. Leaderboard endpoints)
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

const leaderboardCache = new Map<string, CacheEntry>();

// Cache TTL: 10 minutes (also invalidated on score sync)
const CACHE_TTL_MS = 10 * 60 * 1000;

export function getLeaderboardCache<T = any>(key: string): T | null {
  const entry = leaderboardCache.get(key);
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    leaderboardCache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

export function setLeaderboardCache<T = any>(key: string, data: T): void {
  leaderboardCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export function clearLeaderboardCache(): void {
  leaderboardCache.clear();
}

// In-memory cache manager for server responses (Leaderboard & Global Performance Stats)
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
}

const serverCache = new Map<string, CacheEntry>();

const totalMaxOpCache = new Map<string, { value: number, timestamp: number }>();
const MAX_OP_TTL_MS = 30 * 60 * 1000;

export function getTotalMaxOp(key: string): number | null {
  const entry = totalMaxOpCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > MAX_OP_TTL_MS) {
    totalMaxOpCache.delete(key);
    return null;
  }
  return entry.value;
}

export function setTotalMaxOp(key: string, value: number): void {
  totalMaxOpCache.set(key, { value, timestamp: Date.now() });
}

export function normalizeQueryCacheKey(prefix: string, query: Record<string, any>): string {
  const normalizedQuery = { ...query };
  if (typeof normalizedQuery.server === 'string') {
    normalizedQuery.server = normalizedQuery.server.toLowerCase();
  }
  
  const sortedKeys = Object.keys(normalizedQuery).sort();
  const sortedObj: Record<string, any> = {};
  for (const key of sortedKeys) {
    sortedObj[key] = normalizedQuery[key];
  }
  
  return `${prefix}:${JSON.stringify(sortedObj)}`;
}

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
  totalMaxOpCache.clear();
}

// Backward compatibility helpers
export const getLeaderboardCache = getCache;
export const setLeaderboardCache = setCache;
export const clearLeaderboardCache = clearAllCaches;

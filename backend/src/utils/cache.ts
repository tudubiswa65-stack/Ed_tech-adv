import NodeCache from 'node-cache';

// Create a cache instance with default TTL of 60 seconds
// TTL can be overridden per key if needed
const cache = new NodeCache({
  stdTTL: 60,        // Default 60 seconds
  checkperiod: 10,   // Check for expired keys every 10 seconds
  useClones: false,  // Return references to objects for performance
});

/**
 * Get a value from cache
 */
export function cacheGet<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

/**
 * Set a value in cache with optional TTL
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Optional TTL in seconds (overrides default)
 */
export function cacheSet<T>(key: string, value: T, ttl?: number): boolean {
  if (ttl) {
    return cache.set(key, value, ttl);
  }
  return cache.set(key, value);
}

/**
 * Delete a key from cache
 */
export function cacheDel(key: string): number {
  return cache.del(key);
}

/**
 * Check if a key exists in cache
 */
export function cacheHas(key: string): boolean {
  return cache.has(key);
}

/**
 * Clear all cache entries
 */
export function cacheClear(): void {
  cache.flushAll();
}

/**
 * Get cache statistics
 */
export function cacheStats() {
  return cache.getStats();
}

/**
 * Generate a cache key from parts
 * Useful for creating consistent keys for parameterized queries
 */
export function makeCacheKey(parts: (string | number | undefined | null)[]): string {
  return parts.filter(p => p !== undefined && p !== null).join(':');
}

// Default TTL constants for different data types
export const CACHE_TTL = {
  SHORT: 60,      // 60 seconds - for frequently changing data
  MEDIUM: 120,   // 2 minutes - for moderately changing data
  LONG: 300,     // 5 minutes - for rarely changing data
  REFERENCE: 600 // 10 minutes - for reference data like branches, courses
} as const;

export default cache;
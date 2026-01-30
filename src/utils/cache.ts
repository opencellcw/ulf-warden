import NodeCache from 'node-cache';
import { log } from '../logger';

/**
 * Cache Manager
 *
 * In-memory caching layer for frequently accessed data
 */
export class CacheManager {
  private cache: NodeCache;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0
  };

  constructor(options?: { ttl?: number; checkPeriod?: number }) {
    this.cache = new NodeCache({
      stdTTL: options?.ttl || 600,        // 10 min default
      checkperiod: options?.checkPeriod || 120,  // Check every 2 min
      useClones: false  // Better performance
    });

    log.info('[Cache] Initialized', {
      ttl: options?.ttl || 600,
      checkPeriod: options?.checkPeriod || 120
    });
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);

    if (value !== undefined) {
      this.stats.hits++;
      log.debug('[Cache] Hit', { key });
    } else {
      this.stats.misses++;
      log.debug('[Cache] Miss', { key });
    }

    return value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: any, ttl?: number): boolean {
    this.stats.sets++;
    return this.cache.set(key, value, ttl || 0);
  }

  /**
   * Delete key from cache
   */
  delete(key: string): number {
    return this.cache.del(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.flushAll();
    log.info('[Cache] Cleared');
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      keys: this.cache.keys().length
    };
  }

  /**
   * Cached function execution
   */
  async cached<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Execute function
    const result = await fn();

    // Store in cache
    this.set(key, result, ttl);

    return result;
  }

  /**
   * Memoize async function with cache
   */
  memoize<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator: (...args: Parameters<T>) => string,
    ttl?: number
  ): T {
    return (async (...args: Parameters<T>) => {
      const key = keyGenerator(...args);
      return await this.cached(key, () => fn(...args), ttl);
    }) as T;
  }
}

// Export singleton
let cacheInstance: CacheManager | null = null;

export function getCache(): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager();
  }
  return cacheInstance;
}

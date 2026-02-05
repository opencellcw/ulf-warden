/**
 * Unified Caching Layer
 *
 * Redis-first with in-memory fallback for high-performance caching.
 *
 * Features:
 * - Redis as primary cache (distributed, persistent)
 * - In-memory (node-cache) as fallback (fast, local)
 * - Automatic failover between Redis and in-memory
 * - Configurable TTL per cache type
 * - Cache invalidation strategies
 * - Hit/miss statistics
 * - Tag-based invalidation
 */

import { createClient, RedisClientType } from 'redis';
import NodeCache from 'node-cache';
import { log } from '../logger';

export interface CacheConfig {
  redis?: {
    url?: string;
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    keyPrefix?: string;
  };
  memory?: {
    ttl?: number; // Default TTL in seconds
    checkPeriod?: number;
    maxKeys?: number;
  };
  defaultTTL?: number; // Default TTL for all caches (seconds)
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: string;
  provider: 'redis' | 'memory';
  redisConnected: boolean;
  keys: number;
}

export enum CacheNamespace {
  SESSION = 'session',      // User sessions (TTL: 1h)
  TOOL_RESULT = 'tool',     // Tool execution results (TTL: 5min)
  API_RESPONSE = 'api',     // API responses (TTL: 10min)
  DATABASE_QUERY = 'db',    // Database query results (TTL: 15min)
  LLM_RESPONSE = 'llm',     // LLM responses (TTL: 1h)
  USER_DATA = 'user',       // User data (TTL: 30min)
  BOT_STATE = 'bot',        // Bot state (TTL: 10min)
  WORKFLOW = 'workflow',    // Workflow execution (TTL: 1h)
}

// TTL configuration per namespace (in seconds)
const TTL_CONFIG: Record<CacheNamespace, number> = {
  [CacheNamespace.SESSION]: 3600,        // 1 hour
  [CacheNamespace.TOOL_RESULT]: 300,     // 5 minutes
  [CacheNamespace.API_RESPONSE]: 600,    // 10 minutes
  [CacheNamespace.DATABASE_QUERY]: 900,  // 15 minutes
  [CacheNamespace.LLM_RESPONSE]: 3600,   // 1 hour
  [CacheNamespace.USER_DATA]: 1800,      // 30 minutes
  [CacheNamespace.BOT_STATE]: 600,       // 10 minutes
  [CacheNamespace.WORKFLOW]: 3600,       // 1 hour
};

/**
 * Unified Cache Manager
 *
 * Automatically uses Redis when available, falls back to in-memory cache
 */
export class UnifiedCacheManager {
  private redisClient: RedisClientType | null = null;
  private memoryCache: NodeCache;
  private redisConnected: boolean = false;
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || 600, // 10 minutes
      memory: {
        ttl: config.memory?.ttl || 600,
        checkPeriod: config.memory?.checkPeriod || 120,
        maxKeys: config.memory?.maxKeys || 10000,
        ...config.memory,
      },
      redis: config.redis,
    };

    // Initialize in-memory cache (always available)
    this.memoryCache = new NodeCache({
      stdTTL: this.config.memory!.ttl!,
      checkperiod: this.config.memory!.checkPeriod!,
      maxKeys: this.config.memory!.maxKeys!,
      useClones: false, // Better performance
    });

    log.info('[Cache] Unified cache manager initialized', {
      memoryTTL: this.config.memory!.ttl,
      maxKeys: this.config.memory!.maxKeys,
      redisEnabled: !!this.config.redis,
    });

    // Initialize Redis (async, don't block)
    if (this.config.redis) {
      this.initRedis().catch((error) => {
        log.warn('[Cache] Redis initialization failed, using memory-only mode', { error });
      });
    }
  }

  /**
   * Initialize Redis connection
   */
  private async initRedis(): Promise<void> {
    if (!this.config.redis) return;

    try {
      const redisUrl =
        this.config.redis.url ||
        `redis://${this.config.redis.host || 'localhost'}:${this.config.redis.port || 6379}`;

      this.redisClient = createClient({
        url: redisUrl,
        password: this.config.redis.password,
        database: this.config.redis.db || 0,
      });

      // Error handling
      this.redisClient.on('error', (error) => {
        log.error('[Cache] Redis error', { error });
        this.redisConnected = false;
      });

      this.redisClient.on('connect', () => {
        log.info('[Cache] Redis connected');
        this.redisConnected = true;
      });

      this.redisClient.on('disconnect', () => {
        log.warn('[Cache] Redis disconnected');
        this.redisConnected = false;
      });

      // Connect
      await this.redisClient.connect();

      log.info('[Cache] Redis client initialized', {
        url: redisUrl,
        db: this.config.redis.db || 0,
      });
    } catch (error) {
      log.error('[Cache] Redis initialization failed', { error });
      this.redisConnected = false;
      throw error;
    }
  }

  /**
   * Build cache key with namespace
   */
  private buildKey(namespace: CacheNamespace | string, key: string): string {
    const prefix = this.config.redis?.keyPrefix || 'ulf';
    return `${prefix}:${namespace}:${key}`;
  }

  /**
   * Get value from cache (Redis first, memory fallback)
   */
  async get<T>(namespace: CacheNamespace | string, key: string): Promise<T | null> {
    const fullKey = this.buildKey(namespace, key);

    try {
      // Try Redis first
      if (this.redisConnected && this.redisClient) {
        const value = await this.redisClient.get(fullKey);
        if (value !== null) {
          this.stats.hits++;
          log.debug('[Cache] Redis HIT', { key: fullKey });
          return JSON.parse(value) as T;
        }
      }

      // Fallback to memory
      const memValue = this.memoryCache.get<T>(fullKey);
      if (memValue !== undefined) {
        this.stats.hits++;
        log.debug('[Cache] Memory HIT', { key: fullKey });
        return memValue;
      }

      // Miss
      this.stats.misses++;
      log.debug('[Cache] MISS', { key: fullKey });
      return null;
    } catch (error) {
      log.error('[Cache] Get error', { key: fullKey, error });
      // Try memory as last resort
      const memValue = this.memoryCache.get<T>(fullKey);
      return memValue !== undefined ? memValue : null;
    }
  }

  /**
   * Set value in cache (both Redis and memory)
   */
  async set(
    namespace: CacheNamespace | string,
    key: string,
    value: any,
    ttl?: number
  ): Promise<boolean> {
    const fullKey = this.buildKey(namespace, key);
    const effectiveTTL = ttl || TTL_CONFIG[namespace as CacheNamespace] || this.config.defaultTTL!;

    try {
      this.stats.sets++;

      // Set in Redis (if available)
      if (this.redisConnected && this.redisClient) {
        await this.redisClient.setEx(fullKey, effectiveTTL, JSON.stringify(value));
        log.debug('[Cache] Redis SET', { key: fullKey, ttl: effectiveTTL });
      }

      // Always set in memory as backup
      this.memoryCache.set(fullKey, value, effectiveTTL);
      log.debug('[Cache] Memory SET', { key: fullKey, ttl: effectiveTTL });

      return true;
    } catch (error) {
      log.error('[Cache] Set error', { key: fullKey, error });
      // Still try memory
      return this.memoryCache.set(fullKey, value, effectiveTTL);
    }
  }

  /**
   * Delete key from cache
   */
  async delete(namespace: CacheNamespace | string, key: string): Promise<boolean> {
    const fullKey = this.buildKey(namespace, key);

    try {
      this.stats.deletes++;

      // Delete from Redis
      if (this.redisConnected && this.redisClient) {
        await this.redisClient.del(fullKey);
      }

      // Delete from memory
      this.memoryCache.del(fullKey);

      log.debug('[Cache] DELETE', { key: fullKey });
      return true;
    } catch (error) {
      log.error('[Cache] Delete error', { key: fullKey, error });
      return false;
    }
  }

  /**
   * Delete all keys in a namespace (tag-based invalidation)
   */
  async deleteNamespace(namespace: CacheNamespace | string): Promise<number> {
    const pattern = this.buildKey(namespace, '*');

    try {
      let deletedCount = 0;

      // Delete from Redis
      if (this.redisConnected && this.redisClient) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          deletedCount = await this.redisClient.del(keys);
        }
      }

      // Delete from memory
      const memKeys = this.memoryCache.keys().filter((k) => k.startsWith(pattern.replace('*', '')));
      this.memoryCache.del(memKeys);
      deletedCount += memKeys.length;

      log.info('[Cache] Namespace deleted', { namespace, keysDeleted: deletedCount });
      return deletedCount;
    } catch (error) {
      log.error('[Cache] Delete namespace error', { namespace, error });
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      // Clear Redis
      if (this.redisConnected && this.redisClient) {
        await this.redisClient.flushDb();
      }

      // Clear memory
      this.memoryCache.flushAll();

      log.info('[Cache] All caches cleared');
    } catch (error) {
      log.error('[Cache] Clear error', { error });
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.hits / totalRequests) * 100).toFixed(2) : '0.00';

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      provider: this.redisConnected ? 'redis' : 'memory',
      redisConnected: this.redisConnected,
      keys: this.memoryCache.keys().length,
    };
  }

  /**
   * Cached function execution (memoization)
   */
  async cached<T>(
    namespace: CacheNamespace | string,
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = await this.get<T>(namespace, key);
    if (cached !== null) {
      return cached;
    }

    // Execute function
    const result = await fn();

    // Store in cache
    await this.set(namespace, key, result, ttl);

    return result;
  }

  /**
   * Memoize async function with cache
   */
  memoize<T extends (...args: any[]) => Promise<any>>(
    namespace: CacheNamespace | string,
    fn: T,
    keyGenerator: (...args: Parameters<T>) => string,
    ttl?: number
  ): T {
    return (async (...args: Parameters<T>) => {
      const key = keyGenerator(...args);
      return await this.cached(namespace, key, () => fn(...args), ttl);
    }) as T;
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.redisConnected;
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    try {
      if (this.redisClient) {
        await this.redisClient.quit();
      }
      this.memoryCache.flushAll();
      this.memoryCache.close();

      log.info('[Cache] Connections closed');
    } catch (error) {
      log.error('[Cache] Close error', { error });
    }
  }
}

// Export singleton
let cacheInstance: UnifiedCacheManager | null = null;

export function getCache(config?: CacheConfig): UnifiedCacheManager {
  if (!cacheInstance) {
    const redisConfig = config?.redis || {
      url: process.env.REDIS_URL,
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB ? parseInt(process.env.REDIS_DB) : undefined,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'ulf',
    };

    cacheInstance = new UnifiedCacheManager({
      ...config,
      redis: redisConfig,
    });
  }
  return cacheInstance;
}

// Export for convenience
export const cache = getCache();

/**
 * Cache Middleware for Database Operations
 *
 * Transparent caching layer for frequently accessed database queries
 */

import { cache, CacheNamespace } from './cache';
import { log } from '../logger';

export interface CacheOptions {
  ttl?: number;
  namespace?: CacheNamespace | string;
  keyGenerator?: (...args: any[]) => string;
  bypass?: boolean; // Skip cache for this call
}

/**
 * Cache wrapper for database query functions
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: CacheOptions = {}
): T {
  const {
    ttl,
    namespace = CacheNamespace.DATABASE_QUERY,
    keyGenerator = (...args) => JSON.stringify(args),
    bypass = false,
  } = options;

  return (async (...args: Parameters<T>) => {
    // Bypass cache if requested
    if (bypass || process.env.CACHE_DISABLED === 'true') {
      return await fn(...args);
    }

    const cacheKey = keyGenerator(...args);

    // Try to get from cache
    const cached = await cache.get(namespace, cacheKey);
    if (cached !== null) {
      log.debug('[CacheMiddleware] Hit', { namespace, key: cacheKey });
      return cached;
    }

    // Cache miss - execute function
    log.debug('[CacheMiddleware] Miss', { namespace, key: cacheKey });
    const result = await fn(...args);

    // Store in cache
    await cache.set(namespace, cacheKey, result, ttl);

    return result;
  }) as T;
}

/**
 * Decorator for caching methods
 */
export function Cached(options: CacheOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = cached(originalMethod, options);

    return descriptor;
  };
}

/**
 * Invalidate cache for a specific namespace
 */
export async function invalidateCache(namespace: CacheNamespace | string): Promise<number> {
  log.info('[CacheMiddleware] Invalidating cache', { namespace });
  return await cache.deleteNamespace(namespace);
}

/**
 * Invalidate specific cache key
 */
export async function invalidateCacheKey(
  namespace: CacheNamespace | string,
  key: string
): Promise<boolean> {
  log.debug('[CacheMiddleware] Invalidating key', { namespace, key });
  return await cache.delete(namespace, key);
}

/**
 * Cache statistics
 */
export function getCacheStats() {
  return cache.getStats();
}

/**
 * Cached session getter
 */
export const cachedSession = <T extends (...args: any[]) => Promise<any>>(fn: T) =>
  cached(fn, {
    namespace: CacheNamespace.SESSION,
    keyGenerator: (userId: string) => userId,
  });

/**
 * Cached user data getter
 */
export const cachedUserData = <T extends (...args: any[]) => Promise<any>>(fn: T) =>
  cached(fn, {
    namespace: CacheNamespace.USER_DATA,
    keyGenerator: (userId: string) => userId,
  });

/**
 * Cached bot state getter
 */
export const cachedBotState = <T extends (...args: any[]) => Promise<any>>(fn: T) =>
  cached(fn, {
    namespace: CacheNamespace.BOT_STATE,
    keyGenerator: (...args) => args.join(':'),
  });

/**
 * Cache invalidation triggers
 */
export const CacheInvalidation = {
  /**
   * Invalidate session cache when session is updated
   */
  onSessionUpdate: async (userId: string) => {
    await invalidateCacheKey(CacheNamespace.SESSION, userId);
  },

  /**
   * Invalidate user data cache when user data changes
   */
  onUserDataUpdate: async (userId: string) => {
    await invalidateCacheKey(CacheNamespace.USER_DATA, userId);
  },

  /**
   * Invalidate tool results cache when tool is re-executed
   */
  onToolExecution: async (toolName: string, input: any) => {
    const key = `${toolName}:${JSON.stringify(input)}`;
    await invalidateCacheKey(CacheNamespace.TOOL_RESULT, key);
  },

  /**
   * Invalidate all database query cache
   */
  onDatabaseUpdate: async () => {
    await invalidateCache(CacheNamespace.DATABASE_QUERY);
  },

  /**
   * Invalidate workflow cache
   */
  onWorkflowUpdate: async (workflowId: string) => {
    await invalidateCacheKey(CacheNamespace.WORKFLOW, workflowId);
  },
};

/**
 * Express middleware for API response caching
 */
export function apiCacheMiddleware(ttl: number = 600) {
  return async (req: any, res: any, next: any) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = req.originalUrl || req.url;

    // Try cache
    const cached = await cache.get(CacheNamespace.API_RESPONSE, cacheKey);
    if (cached !== null) {
      log.debug('[APICacheMiddleware] Hit', { url: cacheKey });
      return res.json(cached);
    }

    // Cache miss - capture response
    const originalJson = res.json.bind(res);
    res.json = async (body: any) => {
      // Store in cache
      await cache.set(CacheNamespace.API_RESPONSE, cacheKey, body, ttl);
      log.debug('[APICacheMiddleware] Cached', { url: cacheKey, ttl });
      return originalJson(body);
    };

    next();
  };
}

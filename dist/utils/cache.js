"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = void 0;
exports.getCache = getCache;
const node_cache_1 = __importDefault(require("node-cache"));
const logger_1 = require("../logger");
/**
 * Cache Manager
 *
 * In-memory caching layer for frequently accessed data
 */
class CacheManager {
    cache;
    stats = {
        hits: 0,
        misses: 0,
        sets: 0
    };
    constructor(options) {
        this.cache = new node_cache_1.default({
            stdTTL: options?.ttl || 600, // 10 min default
            checkperiod: options?.checkPeriod || 120, // Check every 2 min
            useClones: false // Better performance
        });
        logger_1.log.info('[Cache] Initialized', {
            ttl: options?.ttl || 600,
            checkPeriod: options?.checkPeriod || 120
        });
    }
    /**
     * Get value from cache
     */
    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            this.stats.hits++;
            logger_1.log.debug('[Cache] Hit', { key });
        }
        else {
            this.stats.misses++;
            logger_1.log.debug('[Cache] Miss', { key });
        }
        return value;
    }
    /**
     * Set value in cache
     */
    set(key, value, ttl) {
        this.stats.sets++;
        return this.cache.set(key, value, ttl || 0);
    }
    /**
     * Delete key from cache
     */
    delete(key) {
        return this.cache.del(key);
    }
    /**
     * Clear all cache
     */
    clear() {
        this.cache.flushAll();
        logger_1.log.info('[Cache] Cleared');
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
    async cached(key, fn, ttl) {
        // Check cache first
        const cached = this.get(key);
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
    memoize(fn, keyGenerator, ttl) {
        return (async (...args) => {
            const key = keyGenerator(...args);
            return await this.cached(key, () => fn(...args), ttl);
        });
    }
}
exports.CacheManager = CacheManager;
// Export singleton
let cacheInstance = null;
function getCache() {
    if (!cacheInstance) {
        cacheInstance = new CacheManager();
    }
    return cacheInstance;
}

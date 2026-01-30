"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.ConfigManager = void 0;
const dotenv_1 = require("dotenv");
const database_1 = require("./persistence/database");
const logger_1 = require("./logger");
class ConfigManager {
    static instance;
    config = new Map();
    loaded = false;
    constructor() { }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    async load() {
        if (this.loaded)
            return;
        try {
            // 1. Load from .env file
            (0, dotenv_1.config)();
            logger_1.log.info('[Config] Loaded .env file');
            // 2. Load from environment variables
            for (const [key, value] of Object.entries(process.env)) {
                if (value) {
                    this.config.set(key, value);
                }
            }
            // 3. Override with database values (user preferences)
            try {
                const dbConfig = database_1.database.getAllConfig();
                for (const [key, value] of Object.entries(dbConfig)) {
                    this.config.set(key, value);
                    logger_1.log.debug(`[Config] Override from DB: ${key}`);
                }
                logger_1.log.info(`[Config] Loaded ${Object.keys(dbConfig).length} config values from database`);
            }
            catch (error) {
                // Database might not be initialized yet, that's ok
                logger_1.log.warn('[Config] Could not load config from database (not initialized yet)');
            }
            this.loaded = true;
            logger_1.log.info('[Config] Configuration loaded');
        }
        catch (error) {
            logger_1.log.error('[Config] Failed to load configuration', { error });
            throw error;
        }
    }
    get(key, defaultValue) {
        return this.config.get(key) || defaultValue || '';
    }
    getNumber(key, defaultValue) {
        const value = this.config.get(key);
        if (!value)
            return defaultValue || 0;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? (defaultValue || 0) : parsed;
    }
    getBoolean(key, defaultValue) {
        const value = this.config.get(key);
        if (!value)
            return defaultValue || false;
        return value.toLowerCase() === 'true' || value === '1';
    }
    async set(key, value) {
        this.config.set(key, value);
        // Persist to database
        try {
            database_1.database.saveConfig(key, value);
            logger_1.log.info(`[Config] Saved config: ${key}`);
        }
        catch (error) {
            logger_1.log.error(`[Config] Failed to persist config: ${key}`, { error });
        }
    }
    has(key) {
        return this.config.has(key);
    }
    getAll() {
        const result = {};
        for (const [key, value] of this.config.entries()) {
            // Don't expose sensitive values
            if (this.isSensitiveKey(key)) {
                result[key] = '***';
            }
            else {
                result[key] = value;
            }
        }
        return result;
    }
    isSensitiveKey(key) {
        const sensitivePatterns = [
            'TOKEN',
            'KEY',
            'SECRET',
            'PASSWORD',
            'API_KEY',
            'ANTHROPIC'
        ];
        const upperKey = key.toUpperCase();
        return sensitivePatterns.some(pattern => upperKey.includes(pattern));
    }
    // Hot reload - re-read config without restart
    async reload() {
        logger_1.log.info('[Config] Reloading configuration...');
        this.loaded = false;
        this.config.clear();
        await this.load();
    }
    // LLM-specific configuration helpers
    getLLMConfig() {
        return {
            // Strategy: claude_only, local_only, hybrid, local_fallback
            strategy: this.get('LLM_STRATEGY', 'claude_only'),
            // Local LLM settings
            localEnabled: this.getBoolean('LOCAL_LLM_ENABLED', false),
            localModel: this.get('LOCAL_MODEL_NAME', 'Xenova/LaMini-Flan-T5-783M'),
            modelCacheDir: this.get('MODEL_CACHE_DIR', './.cache/models'),
            // Claude settings
            claudeModel: this.get('CLAUDE_MODEL', 'claude-sonnet-4-20250514'),
            anthropicApiKey: this.get('ANTHROPIC_API_KEY', '')
        };
    }
}
exports.ConfigManager = ConfigManager;
// Export singleton instance
exports.config = ConfigManager.getInstance();

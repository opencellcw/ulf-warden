import { config as dotenvConfig } from 'dotenv';
import { database } from './persistence/database';
import { log } from './logger';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Map<string, string> = new Map();
  private loaded: boolean = false;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  async load(): Promise<void> {
    if (this.loaded) return;

    try {
      // 1. Load from .env file
      dotenvConfig();
      log.info('[Config] Loaded .env file');

      // 2. Load from environment variables
      for (const [key, value] of Object.entries(process.env)) {
        if (value) {
          this.config.set(key, value);
        }
      }

      // 3. Override with database values (user preferences)
      try {
        const dbConfig = database.getAllConfig();
        for (const [key, value] of Object.entries(dbConfig)) {
          this.config.set(key, value);
          log.debug(`[Config] Override from DB: ${key}`);
        }
        log.info(`[Config] Loaded ${Object.keys(dbConfig).length} config values from database`);
      } catch (error) {
        // Database might not be initialized yet, that's ok
        log.warn('[Config] Could not load config from database (not initialized yet)');
      }

      this.loaded = true;
      log.info('[Config] Configuration loaded');
    } catch (error) {
      log.error('[Config] Failed to load configuration', { error });
      throw error;
    }
  }

  get(key: string, defaultValue?: string): string {
    return this.config.get(key) || defaultValue || '';
  }

  getNumber(key: string, defaultValue?: number): number {
    const value = this.config.get(key);
    if (!value) return defaultValue || 0;

    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? (defaultValue || 0) : parsed;
  }

  getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = this.config.get(key);
    if (!value) return defaultValue || false;

    return value.toLowerCase() === 'true' || value === '1';
  }

  async set(key: string, value: string): Promise<void> {
    this.config.set(key, value);

    // Persist to database
    try {
      database.saveConfig(key, value);
      log.info(`[Config] Saved config: ${key}`);
    } catch (error) {
      log.error(`[Config] Failed to persist config: ${key}`, { error });
    }
  }

  has(key: string): boolean {
    return this.config.has(key);
  }

  getAll(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.config.entries()) {
      // Don't expose sensitive values
      if (this.isSensitiveKey(key)) {
        result[key] = '***';
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private isSensitiveKey(key: string): boolean {
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
  async reload(): Promise<void> {
    log.info('[Config] Reloading configuration...');
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

// Export singleton instance
export const config = ConfigManager.getInstance();

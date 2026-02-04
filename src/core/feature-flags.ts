import { DatabaseManager } from '../persistence/database';
import { log } from '../logger';

export enum Feature {
  OUTPUT_PARSER = 'output_parser',
  RETRY_ENGINE = 'retry_engine',
  TOOL_REGISTRY = 'tool_registry',
  WORKFLOW_MANAGER = 'workflow_manager',
  TELEMETRY = 'telemetry'
}

export class FeatureFlags {
  private flags: Map<Feature, boolean> = new Map();
  private dbManager: DatabaseManager | null = null;
  private initialized: boolean = false;

  /**
   * Initialize feature flags (call after database is ready)
   */
  async init(dbManager: DatabaseManager): Promise<void> {
    this.dbManager = dbManager;
    await this.loadFromDatabase();
    this.initialized = true;
    log.info('[FeatureFlags] Initialized', { flags: this.getAllFlags() });
  }

  /**
   * Load feature flags from database
   */
  private async loadFromDatabase(): Promise<void> {
    if (!this.dbManager) {
      log.warn('[FeatureFlags] No database manager, using defaults');
      this.setDefaults();
      return;
    }

    try {
      const db = this.dbManager.getDb();
      const stmt = db.prepare('SELECT key, value FROM config WHERE key LIKE ?');
      const rows = stmt.all('feature_%');

      for (const row of rows as any[]) {
        const featureName = row.key.replace('feature_', '');
        const feature = featureName as Feature;
        this.flags.set(feature, row.value === 'true');
      }

      // Set defaults for any missing flags
      for (const feature of Object.values(Feature)) {
        if (!this.flags.has(feature)) {
          this.flags.set(feature, this.getDefaultValue(feature));
        }
      }

      log.info('[FeatureFlags] Loaded from database', {
        flags: Object.fromEntries(this.flags)
      });
    } catch (error) {
      log.warn('[FeatureFlags] Failed to load from database, using defaults', { error });
      this.setDefaults();
    }
  }

  /**
   * Get default value for a feature
   */
  private getDefaultValue(feature: Feature): boolean {
    switch (feature) {
      case Feature.OUTPUT_PARSER:
        return true; // Phase 1 - Stable
      case Feature.RETRY_ENGINE:
        return true; // Phase 1 - Stable
      case Feature.TOOL_REGISTRY:
        return false; // Phase 2 - Experimental
      case Feature.WORKFLOW_MANAGER:
        return false; // Phase 2 - Experimental
      case Feature.TELEMETRY:
        return false; // Phase 3 - Experimental
      default:
        return false;
    }
  }

  /**
   * Set default feature flags
   */
  private setDefaults(): void {
    for (const feature of Object.values(Feature)) {
      this.flags.set(feature, this.getDefaultValue(feature));
    }
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(feature: Feature): boolean {
    if (!this.initialized) {
      log.warn('[FeatureFlags] Not initialized, returning default', { feature });
      return this.getDefaultValue(feature);
    }
    return this.flags.get(feature) || false;
  }

  /**
   * Enable a feature
   */
  async enable(feature: Feature): Promise<void> {
    this.flags.set(feature, true);

    if (this.dbManager) {
      try {
        const db = this.dbManager.getDb();
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO config (key, value, updatedAt)
          VALUES (?, ?, ?)
        `);
        stmt.run(`feature_${feature}`, 'true', new Date().toISOString());
        log.info('[FeatureFlags] Feature enabled', { feature });
      } catch (error) {
        log.error('[FeatureFlags] Failed to persist feature flag', { feature, error });
      }
    }
  }

  /**
   * Disable a feature
   */
  async disable(feature: Feature): Promise<void> {
    this.flags.set(feature, false);

    if (this.dbManager) {
      try {
        const db = this.dbManager.getDb();
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO config (key, value, updatedAt)
          VALUES (?, ?, ?)
        `);
        stmt.run(`feature_${feature}`, 'false', new Date().toISOString());
        log.info('[FeatureFlags] Feature disabled', { feature });
      } catch (error) {
        log.error('[FeatureFlags] Failed to persist feature flag', { feature, error });
      }
    }
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const [feature, enabled] of this.flags.entries()) {
      result[feature] = enabled;
    }
    return result;
  }

  /**
   * Toggle a feature (for testing)
   */
  async toggle(feature: Feature): Promise<void> {
    const current = this.isEnabled(feature);
    if (current) {
      await this.disable(feature);
    } else {
      await this.enable(feature);
    }
  }
}

// Singleton instance
export const featureFlags = new FeatureFlags();

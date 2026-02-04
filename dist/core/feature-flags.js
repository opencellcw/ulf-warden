"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureFlags = exports.FeatureFlags = exports.Feature = void 0;
const logger_1 = require("../logger");
var Feature;
(function (Feature) {
    Feature["OUTPUT_PARSER"] = "output_parser";
    Feature["RETRY_ENGINE"] = "retry_engine";
    Feature["TOOL_REGISTRY"] = "tool_registry";
    Feature["WORKFLOW_MANAGER"] = "workflow_manager";
    Feature["TELEMETRY"] = "telemetry";
})(Feature || (exports.Feature = Feature = {}));
class FeatureFlags {
    flags = new Map();
    dbManager = null;
    initialized = false;
    /**
     * Initialize feature flags (call after database is ready)
     */
    async init(dbManager) {
        this.dbManager = dbManager;
        await this.loadFromDatabase();
        this.initialized = true;
        logger_1.log.info('[FeatureFlags] Initialized', { flags: this.getAllFlags() });
    }
    /**
     * Load feature flags from database
     */
    async loadFromDatabase() {
        if (!this.dbManager) {
            logger_1.log.warn('[FeatureFlags] No database manager, using defaults');
            this.setDefaults();
            return;
        }
        try {
            const db = this.dbManager.getDb();
            const stmt = db.prepare('SELECT key, value FROM config WHERE key LIKE ?');
            const rows = stmt.all('feature_%');
            for (const row of rows) {
                const featureName = row.key.replace('feature_', '');
                const feature = featureName;
                this.flags.set(feature, row.value === 'true');
            }
            // Set defaults for any missing flags
            for (const feature of Object.values(Feature)) {
                if (!this.flags.has(feature)) {
                    this.flags.set(feature, this.getDefaultValue(feature));
                }
            }
            logger_1.log.info('[FeatureFlags] Loaded from database', {
                flags: Object.fromEntries(this.flags)
            });
        }
        catch (error) {
            logger_1.log.warn('[FeatureFlags] Failed to load from database, using defaults', { error });
            this.setDefaults();
        }
    }
    /**
     * Get default value for a feature
     */
    getDefaultValue(feature) {
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
    setDefaults() {
        for (const feature of Object.values(Feature)) {
            this.flags.set(feature, this.getDefaultValue(feature));
        }
    }
    /**
     * Check if feature is enabled
     */
    isEnabled(feature) {
        if (!this.initialized) {
            logger_1.log.warn('[FeatureFlags] Not initialized, returning default', { feature });
            return this.getDefaultValue(feature);
        }
        return this.flags.get(feature) || false;
    }
    /**
     * Enable a feature
     */
    async enable(feature) {
        this.flags.set(feature, true);
        if (this.dbManager) {
            try {
                const db = this.dbManager.getDb();
                const stmt = db.prepare(`
          INSERT OR REPLACE INTO config (key, value, updatedAt)
          VALUES (?, ?, ?)
        `);
                stmt.run(`feature_${feature}`, 'true', new Date().toISOString());
                logger_1.log.info('[FeatureFlags] Feature enabled', { feature });
            }
            catch (error) {
                logger_1.log.error('[FeatureFlags] Failed to persist feature flag', { feature, error });
            }
        }
    }
    /**
     * Disable a feature
     */
    async disable(feature) {
        this.flags.set(feature, false);
        if (this.dbManager) {
            try {
                const db = this.dbManager.getDb();
                const stmt = db.prepare(`
          INSERT OR REPLACE INTO config (key, value, updatedAt)
          VALUES (?, ?, ?)
        `);
                stmt.run(`feature_${feature}`, 'false', new Date().toISOString());
                logger_1.log.info('[FeatureFlags] Feature disabled', { feature });
            }
            catch (error) {
                logger_1.log.error('[FeatureFlags] Failed to persist feature flag', { feature, error });
            }
        }
    }
    /**
     * Get all feature flags
     */
    getAllFlags() {
        const result = {};
        for (const [feature, enabled] of this.flags.entries()) {
            result[feature] = enabled;
        }
        return result;
    }
    /**
     * Toggle a feature (for testing)
     */
    async toggle(feature) {
        const current = this.isEnabled(feature);
        if (current) {
            await this.disable(feature);
        }
        else {
            await this.enable(feature);
        }
    }
}
exports.FeatureFlags = FeatureFlags;
// Singleton instance
exports.featureFlags = new FeatureFlags();

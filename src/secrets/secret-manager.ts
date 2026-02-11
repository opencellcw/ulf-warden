/**
 * Secret Manager
 *
 * Thin wrapper over the config table with `secret:` prefix.
 * Stores secrets in SQLite and syncs them to process.env.
 */

import { database } from '../persistence/database';
import { log } from '../logger';

const SECRET_PREFIX = 'secret:';

class SecretManager {
  /**
   * Load all secrets from DB into process.env (call on startup)
   */
  loadAllSecrets(): void {
    try {
      const allConfig = database.getAllConfig();
      let count = 0;

      for (const [key, value] of Object.entries(allConfig)) {
        if (key.startsWith(SECRET_PREFIX)) {
          const envKey = key.slice(SECRET_PREFIX.length);
          process.env[envKey] = value;
          count++;
        }
      }

      if (count > 0) {
        log.info('[SecretManager] Loaded secrets into process.env', { count });
      }
    } catch (error: any) {
      log.error('[SecretManager] Failed to load secrets', { error: error.message });
    }
  }

  /**
   * Set a secret: saves to DB + sets process.env
   */
  setSecret(key: string, value: string): void {
    database.saveConfig(`${SECRET_PREFIX}${key}`, value);
    process.env[key] = value;
    log.info('[SecretManager] Secret saved', { key });
  }

  /**
   * Get a secret value from DB
   */
  getSecret(key: string): string | null {
    return database.getConfig(`${SECRET_PREFIX}${key}`);
  }

  /**
   * List all secret keys (without values)
   */
  listSecrets(): string[] {
    const allConfig = database.getAllConfig();
    return Object.keys(allConfig)
      .filter(k => k.startsWith(SECRET_PREFIX))
      .map(k => k.slice(SECRET_PREFIX.length));
  }

  /**
   * Delete a secret from DB + remove from process.env
   */
  deleteSecret(key: string): boolean {
    const exists = this.getSecret(key);
    if (!exists) return false;

    const db = database.getDb();
    db.prepare('DELETE FROM config WHERE key = ?').run(`${SECRET_PREFIX}${key}`);
    delete process.env[key];
    log.info('[SecretManager] Secret deleted', { key });
    return true;
  }
}

export const secretManager = new SecretManager();

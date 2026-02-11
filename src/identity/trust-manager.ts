import { log } from '../logger';
import { persistence } from '../persistence';
import { contactManager, TrustLevel } from './contacts';

/**
 * Dynamic Trust Manager
 *
 * Tracks user interactions and automatically adjusts trust levels:
 * - unknown → known: After user introduces themselves
 * - known → trusted: After N positive interactions (default: 20)
 * - trusted → owner: NEVER automatic (manual only via contacts.md)
 *
 * Trust data is persisted in SQLite for durability.
 *
 * ## Permission Levels (what each level CAN do):
 *
 * | Level   | Read Files | Write Files | Shell Cmds | K8s/Deploy | Sensitive |
 * |---------|------------|-------------|------------|------------|-----------|
 * | unknown | ❌ No      | ❌ No       | ❌ No      | ❌ No      | ❌ No     |
 * | known   | ✅ Basic   | ❌ No       | ❌ No      | ❌ No      | ❌ No     |
 * | trusted | ✅ Yes     | ⚠️ Limited  | ❌ No      | ❌ No      | ❌ No     |
 * | owner   | ✅ Full    | ✅ Full     | ✅ Full    | ✅ Full    | ✅ Full   |
 *
 * NOTE: Only 'owner' has elevated permissions. 'trusted' just means the bot
 * won't ask "who are you?" and will be friendlier, but NO dangerous tools!
 */

export interface UserTrustData {
  userId: string;
  username: string | null;
  trustLevel: TrustLevel;
  interactionCount: number;
  positiveScore: number;
  firstSeen: string;
  lastSeen: string;
  promotedAt: string | null;
  notes: string | null;
}

// Thresholds for trust progression
const TRUST_CONFIG = {
  // Interactions needed to go from known → trusted
  KNOWN_TO_TRUSTED_THRESHOLD: 20,

  // Minimum days as 'known' before promotion to trusted
  MIN_DAYS_AS_KNOWN: 1,

  // Positive interaction weight
  POSITIVE_INTERACTION_WEIGHT: 1,

  // Negative interaction weight (when blocked by security)
  NEGATIVE_INTERACTION_WEIGHT: -5,
};

class TrustManager {
  private initialized = false;

  /**
   * Initialize trust tables in database
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const db = persistence.getDatabaseManager().getDb();

      // Create trust_levels table
      db.exec(`
        CREATE TABLE IF NOT EXISTS trust_levels (
          user_id TEXT PRIMARY KEY,
          platform TEXT NOT NULL DEFAULT 'discord',
          username TEXT,
          trust_level TEXT NOT NULL DEFAULT 'unknown',
          interaction_count INTEGER DEFAULT 0,
          positive_score INTEGER DEFAULT 0,
          first_seen TEXT NOT NULL,
          last_seen TEXT NOT NULL,
          promoted_at TEXT,
          notes TEXT
        )
      `);

      // Create interaction_log table for audit
      db.exec(`
        CREATE TABLE IF NOT EXISTS interaction_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          action_type TEXT NOT NULL,
          was_blocked INTEGER DEFAULT 0,
          tool_used TEXT,
          notes TEXT
        )
      `);

      // Create indexes
      db.exec(`CREATE INDEX IF NOT EXISTS idx_trust_user_id ON trust_levels(user_id)`);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_interaction_user ON interaction_log(user_id)`);

      this.initialized = true;
      log.info('[TrustManager] Initialized with database tables');
    } catch (error: any) {
      log.error('[TrustManager] Failed to initialize', { error: error.message });
    }
  }

  /**
   * Record a user interaction and potentially update trust level
   */
  async recordInteraction(
    userId: string,
    platform: string = 'discord',
    options: {
      username?: string;
      wasBlocked?: boolean;
      toolUsed?: string;
      introducedAs?: string;
    } = {}
  ): Promise<{ trustLevel: TrustLevel; promoted: boolean; newLevel?: TrustLevel }> {
    await this.init();

    const { username, wasBlocked = false, toolUsed, introducedAs } = options;
    const now = new Date().toISOString();
    const db = persistence.getDatabaseManager().getDb();

    // Check if user is already an owner in contacts.md (never override)
    const staticTrust = contactManager.getTrustLevel(userId);
    if (staticTrust === 'owner') {
      return { trustLevel: 'owner', promoted: false };
    }

    // Get or create user trust record
    const selectStmt = db.prepare('SELECT * FROM trust_levels WHERE user_id = ?');
    let userData = selectStmt.get(userId) as any;

    if (!userData) {
      // New user - create record
      const insertStmt = db.prepare(`
        INSERT INTO trust_levels (user_id, platform, username, trust_level, interaction_count, positive_score, first_seen, last_seen)
        VALUES (?, ?, ?, 'unknown', 1, ?, ?, ?)
      `);
      insertStmt.run(userId, platform, username || introducedAs, wasBlocked ? 0 : 1, now, now);

      userData = {
        user_id: userId,
        trust_level: 'unknown',
        interaction_count: 1,
        positive_score: wasBlocked ? 0 : 1,
        first_seen: now,
        username: username || introducedAs
      };

      log.info('[TrustManager] New user registered', {
        userId,
        platform,
        trustLevel: 'unknown'
      });
    } else {
      // Update existing user
      const scoreChange = wasBlocked
        ? TRUST_CONFIG.NEGATIVE_INTERACTION_WEIGHT
        : TRUST_CONFIG.POSITIVE_INTERACTION_WEIGHT;

      const updateStmt = db.prepare(`
        UPDATE trust_levels
        SET interaction_count = interaction_count + 1,
            positive_score = MAX(0, positive_score + ?),
            last_seen = ?,
            username = COALESCE(?, username)
        WHERE user_id = ?
      `);
      updateStmt.run(scoreChange, now, username || introducedAs, userId);

      userData.interaction_count += 1;
      userData.positive_score = Math.max(0, (userData.positive_score || 0) + scoreChange);
    }

    // Log the interaction
    const logStmt = db.prepare(`
      INSERT INTO interaction_log (user_id, timestamp, action_type, was_blocked, tool_used)
      VALUES (?, ?, ?, ?, ?)
    `);
    logStmt.run(userId, now, toolUsed || 'message', wasBlocked ? 1 : 0, toolUsed || null);

    // Check for trust promotion
    const promotionResult = await this.checkAndPromote(userId, userData, introducedAs);

    return promotionResult;
  }

  /**
   * Check if user should be promoted to higher trust level
   */
  private async checkAndPromote(
    userId: string,
    userData: any,
    introducedAs?: string
  ): Promise<{ trustLevel: TrustLevel; promoted: boolean; newLevel?: TrustLevel }> {
    const db = persistence.getDatabaseManager().getDb();
    const currentLevel = userData.trust_level as TrustLevel;
    let newLevel: TrustLevel | null = null;

    // unknown → known: When user introduces themselves or has positive interactions
    if (currentLevel === 'unknown') {
      if (introducedAs || (userData.positive_score || 0) >= 3) {
        newLevel = 'known';

        const updateStmt = db.prepare(`
          UPDATE trust_levels
          SET trust_level = 'known',
              username = COALESCE(?, username),
              promoted_at = ?,
              notes = 'Auto-promoted: user introduced themselves or had positive interactions'
          WHERE user_id = ?
        `);
        updateStmt.run(introducedAs, new Date().toISOString(), userId);

        log.info('[TrustManager] User promoted: unknown → known', {
          userId,
          name: introducedAs || userData.username,
          positiveScore: userData.positive_score
        });
      }
    }

    // known → trusted: After threshold interactions and minimum time
    if (currentLevel === 'known') {
      const daysSinceFirst = this.daysBetween(userData.first_seen, new Date().toISOString());

      if (
        (userData.positive_score || 0) >= TRUST_CONFIG.KNOWN_TO_TRUSTED_THRESHOLD &&
        daysSinceFirst >= TRUST_CONFIG.MIN_DAYS_AS_KNOWN
      ) {
        newLevel = 'trusted';

        const updateStmt = db.prepare(`
          UPDATE trust_levels
          SET trust_level = 'trusted',
              promoted_at = ?,
              notes = 'Auto-promoted: reached trust threshold'
          WHERE user_id = ?
        `);
        updateStmt.run(new Date().toISOString(), userId);

        log.info('[TrustManager] User promoted: known → trusted', {
          userId,
          name: userData.username,
          positiveScore: userData.positive_score,
          daysSinceFirst
        });
      }
    }

    // trusted → owner: NEVER automatic

    return {
      trustLevel: newLevel || currentLevel,
      promoted: newLevel !== null,
      newLevel: newLevel || undefined
    };
  }

  /**
   * Get trust level for a user (combines static contacts.md + dynamic database)
   */
  async getTrustLevel(userId: string): Promise<TrustLevel> {
    // Static contacts.md takes precedence (especially for owners)
    const staticLevel = contactManager.getTrustLevel(userId);
    if (staticLevel !== 'unknown') {
      return staticLevel;
    }

    // Check database for dynamic trust
    await this.init();
    const db = persistence.getDatabaseManager().getDb();
    const stmt = db.prepare('SELECT trust_level FROM trust_levels WHERE user_id = ?');
    const userData = stmt.get(userId) as any;

    return (userData?.trust_level as TrustLevel) || 'unknown';
  }

  /**
   * Get full user trust data
   */
  async getUserTrustData(userId: string): Promise<UserTrustData | null> {
    await this.init();
    const db = persistence.getDatabaseManager().getDb();

    const stmt = db.prepare('SELECT * FROM trust_levels WHERE user_id = ?');
    const data = stmt.get(userId) as any;

    if (!data) return null;

    return {
      userId: data.user_id,
      username: data.username,
      trustLevel: data.trust_level,
      interactionCount: data.interaction_count,
      positiveScore: data.positive_score,
      firstSeen: data.first_seen,
      lastSeen: data.last_seen,
      promotedAt: data.promoted_at,
      notes: data.notes
    };
  }

  /**
   * Get trust statistics
   */
  async getStats(): Promise<{
    totalUsers: number;
    byLevel: Record<TrustLevel, number>;
    recentPromotions: number;
  }> {
    await this.init();
    const db = persistence.getDatabaseManager().getDb();

    const totalStmt = db.prepare('SELECT COUNT(*) as count FROM trust_levels');
    const total = totalStmt.get() as any;

    const byLevelStmt = db.prepare(`
      SELECT trust_level, COUNT(*) as count
      FROM trust_levels
      GROUP BY trust_level
    `);
    const byLevel = byLevelStmt.all() as any[];

    const recentStmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM trust_levels
      WHERE promoted_at > datetime('now', '-7 days')
    `);
    const recentPromotions = recentStmt.get() as any;

    const levelCounts: Record<TrustLevel, number> = {
      owner: 0,
      trusted: 0,
      known: 0,
      unknown: 0
    };

    for (const row of byLevel) {
      levelCounts[row.trust_level as TrustLevel] = row.count;
    }

    return {
      totalUsers: total?.count || 0,
      byLevel: levelCounts,
      recentPromotions: recentPromotions?.count || 0
    };
  }

  /**
   * Manually set trust level (for admin use)
   */
  async setTrustLevel(
    userId: string,
    level: TrustLevel,
    adminNote?: string
  ): Promise<void> {
    // Owner can only be set via contacts.md
    if (level === 'owner') {
      throw new Error('Owner status can only be set in contacts.md for security');
    }

    await this.init();
    const db = persistence.getDatabaseManager().getDb();
    const now = new Date().toISOString();

    // Check if user exists
    const checkStmt = db.prepare('SELECT user_id FROM trust_levels WHERE user_id = ?');
    const exists = checkStmt.get(userId);

    if (exists) {
      const updateStmt = db.prepare(`
        UPDATE trust_levels
        SET trust_level = ?,
            notes = ?,
            promoted_at = ?
        WHERE user_id = ?
      `);
      updateStmt.run(level, adminNote, now, userId);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO trust_levels (user_id, platform, trust_level, first_seen, last_seen, notes, promoted_at)
        VALUES (?, 'manual', ?, ?, ?, ?, ?)
      `);
      insertStmt.run(userId, level, now, now, adminNote, now);
    }

    log.info('[TrustManager] Trust level manually set', { userId, level, adminNote });
  }

  /**
   * Helper: Calculate days between two dates
   */
  private daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}

export const trustManager = new TrustManager();

import Database from 'better-sqlite3';
import path from 'path';
import { log } from '../logger';
import { FeedbackData, LearningInsight, EvolutionChange, EvolutionStats } from './types';

/**
 * Learning Database
 *
 * Stores interactions, insights, and evolution history
 */
export class LearningDatabase {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.env.DATA_DIR || './data', 'ulf_learning.db');
    this.db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    this.initTables();

    log.info('[LearningDB] Initialized', { path: dbPath });
  }

  private initTables(): void {
    // Interactions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE,
        user_id TEXT,
        user_input TEXT,
        ulf_response TEXT,
        reaction TEXT,
        follow_up TEXT,
        satisfaction_score REAL,
        timestamp TEXT,
        processed BOOLEAN DEFAULT 0
      )
    `);

    // Learning insights table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS learning_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insight_type TEXT,
        content TEXT,
        confidence_score REAL,
        applied BOOLEAN DEFAULT 0,
        created_at TEXT,
        metadata TEXT
      )
    `);

    // Evolution log table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        change_type TEXT,
        old_value TEXT,
        new_value TEXT,
        reason TEXT,
        approved_by TEXT,
        timestamp TEXT,
        rollbackable BOOLEAN DEFAULT 1
      )
    `);

    // Create indices
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_interactions_satisfaction ON interactions(satisfaction_score);
      CREATE INDEX IF NOT EXISTS idx_insights_type ON learning_insights(insight_type);
      CREATE INDEX IF NOT EXISTS idx_evolution_timestamp ON evolution_log(timestamp);
    `);

    log.info('[LearningDB] Tables initialized');
  }

  /**
   * Store interaction feedback
   */
  storeInteraction(feedback: FeedbackData): void {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO interactions (
          message_id, user_id, user_input, ulf_response, reaction,
          follow_up, satisfaction_score, timestamp, processed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        feedback.messageId,
        feedback.userId,
        feedback.userInput,
        feedback.ulfResponse,
        feedback.reaction || null,
        feedback.followUp || null,
        feedback.satisfactionScore,
        feedback.timestamp,
        feedback.processed ? 1 : 0
      );

      log.info('[LearningDB] Interaction stored', {
        messageId: feedback.messageId,
        satisfaction: feedback.satisfactionScore
      });
    } catch (error: any) {
      log.error('[LearningDB] Failed to store interaction', {
        error: error.message
      });
    }
  }

  /**
   * Get recent interactions
   */
  getRecentInteractions(days: number = 7): FeedbackData[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const stmt = this.db.prepare(`
      SELECT * FROM interactions
      WHERE timestamp >= ?
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(cutoffDate.toISOString()) as any[];

    return rows.map(row => ({
      messageId: row.message_id,
      userId: row.user_id,
      userInput: row.user_input,
      ulfResponse: row.ulf_response,
      reaction: row.reaction,
      followUp: row.follow_up,
      satisfactionScore: row.satisfaction_score,
      timestamp: row.timestamp,
      processed: Boolean(row.processed)
    }));
  }

  /**
   * Store learning insight
   */
  storeInsight(insight: LearningInsight): number {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO learning_insights (
          insight_type, content, confidence_score, applied, created_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        insight.insightType,
        insight.content,
        insight.confidenceScore,
        insight.applied ? 1 : 0,
        insight.createdAt,
        insight.metadata ? JSON.stringify(insight.metadata) : null
      );

      log.info('[LearningDB] Insight stored', {
        id: result.lastInsertRowid,
        type: insight.insightType
      });

      return result.lastInsertRowid as number;
    } catch (error: any) {
      log.error('[LearningDB] Failed to store insight', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get pending insights (not applied)
   */
  getPendingInsights(): LearningInsight[] {
    const stmt = this.db.prepare(`
      SELECT * FROM learning_insights
      WHERE applied = 0
      ORDER BY confidence_score DESC, created_at DESC
    `);

    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      insightType: row.insight_type,
      content: row.content,
      confidenceScore: row.confidence_score,
      applied: Boolean(row.applied),
      createdAt: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  /**
   * Mark insight as applied
   */
  markInsightApplied(insightId: number): void {
    const stmt = this.db.prepare(`
      UPDATE learning_insights
      SET applied = 1
      WHERE id = ?
    `);

    stmt.run(insightId);

    log.info('[LearningDB] Insight marked as applied', { id: insightId });
  }

  /**
   * Log evolution change
   */
  logEvolutionChange(change: EvolutionChange): number {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO evolution_log (
          change_type, old_value, new_value, reason, approved_by, timestamp, rollbackable
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(
        change.changeType,
        change.oldValue || null,
        change.newValue,
        change.reason,
        change.approvedBy || null,
        change.timestamp,
        change.rollbackable ? 1 : 0
      );

      log.info('[LearningDB] Evolution change logged', {
        id: result.lastInsertRowid,
        type: change.changeType
      });

      return result.lastInsertRowid as number;
    } catch (error: any) {
      log.error('[LearningDB] Failed to log evolution change', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get evolution history
   */
  getEvolutionHistory(limit: number = 50): EvolutionChange[] {
    const stmt = this.db.prepare(`
      SELECT * FROM evolution_log
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];

    return rows.map(row => ({
      id: row.id,
      changeType: row.change_type,
      oldValue: row.old_value,
      newValue: row.new_value,
      reason: row.reason,
      approvedBy: row.approved_by,
      timestamp: row.timestamp,
      rollbackable: Boolean(row.rollbackable)
    }));
  }

  /**
   * Get evolution statistics
   */
  getEvolutionStats(days: number = 7): EvolutionStats {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Average satisfaction
    const avgStmt = this.db.prepare(`
      SELECT AVG(satisfaction_score) as avg_satisfaction
      FROM interactions
      WHERE timestamp >= ?
    `);

    const avgResult = avgStmt.get(cutoffDate.toISOString()) as any;
    const avgSatisfaction = avgResult.avg_satisfaction || 0.5;

    // Corrections count (negative reactions + negative follow-ups)
    const correctionsStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM interactions
      WHERE timestamp >= ?
        AND (satisfaction_score < 0.3 OR follow_up IS NOT NULL)
    `);

    const correctionsResult = correctionsStmt.get(cutoffDate.toISOString()) as any;
    const correctionsCount = correctionsResult.count || 0;

    // New learnings
    const learningsStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM learning_insights
      WHERE created_at >= ?
    `);

    const learningsResult = learningsStmt.get(cutoffDate.toISOString()) as any;
    const newLearnings = learningsResult.count || 0;

    // Total interactions
    const totalStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM interactions
      WHERE timestamp >= ?
    `);

    const totalResult = totalStmt.get(cutoffDate.toISOString()) as any;
    const totalInteractions = totalResult.count || 0;

    // Trend direction (compare with previous period)
    const prevCutoffDate = new Date(cutoffDate);
    prevCutoffDate.setDate(prevCutoffDate.getDate() - days);

    const prevAvgStmt = this.db.prepare(`
      SELECT AVG(satisfaction_score) as avg_satisfaction
      FROM interactions
      WHERE timestamp >= ? AND timestamp < ?
    `);

    const prevAvgResult = prevAvgStmt.get(prevCutoffDate.toISOString(), cutoffDate.toISOString()) as any;
    const prevAvgSatisfaction = prevAvgResult.avg_satisfaction || 0.5;

    let trendDirection: 'improving' | 'stable' | 'declining' = 'stable';
    if (avgSatisfaction > prevAvgSatisfaction + 0.05) {
      trendDirection = 'improving';
    } else if (avgSatisfaction < prevAvgSatisfaction - 0.05) {
      trendDirection = 'declining';
    }

    // Improvement areas (pending insights)
    const improvementAreas = this.getPendingInsights()
      .map(i => i.insightType)
      .filter((v, i, a) => a.indexOf(v) === i); // unique

    return {
      avgSatisfaction,
      correctionsCount,
      newLearnings,
      improvementAreas,
      totalInteractions,
      trendDirection
    };
  }

  /**
   * Mark interactions as processed
   */
  markInteractionsProcessed(messageIds: string[]): void {
    if (messageIds.length === 0) return;

    const placeholders = messageIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`
      UPDATE interactions
      SET processed = 1
      WHERE message_id IN (${placeholders})
    `);

    stmt.run(...messageIds);

    log.info('[LearningDB] Interactions marked as processed', {
      count: messageIds.length
    });
  }

  /**
   * Close database
   */
  close(): void {
    this.db.close();
    log.info('[LearningDB] Database closed');
  }
}

// Export singleton
let learningDBInstance: LearningDatabase | null = null;

export function getLearningDatabase(): LearningDatabase {
  if (!learningDBInstance) {
    learningDBInstance = new LearningDatabase();
  }
  return learningDBInstance;
}

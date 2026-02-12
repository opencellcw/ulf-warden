/**
 * Smart Feedback Trigger
 * 
 * Sistema inteligente que decide QUANDO pedir feedback ao usuário.
 * 
 * Features:
 * - 🎯 Context-aware (só pergunta quando faz sentido)
 * - ⏰ Rate limiting (max 2x por dia por usuário)
 * - 📊 Importance scoring (mensagens importantes > triviais)
 * - 🚫 Non-intrusive (nunca spam)
 * - 💬 On-demand (comando /feedback sempre disponível)
 * 
 * Quando PEDIR feedback:
 * ✅ Após comandos complexos (deploy, debug, analysis)
 * ✅ Após respostas longas (>500 chars)
 * ✅ Após usar tools (code execution, API calls)
 * ✅ Após erros ou problemas
 * ✅ Primeira interação do dia
 * 
 * Quando NÃO pedir:
 * ❌ Conversas triviais ("oi", "obrigado")
 * ❌ Já pediu hoje (rate limit)
 * ❌ Mensagens muito curtas
 * ❌ Respostas intermediárias (comandos multi-step)
 */

import Database from 'better-sqlite3';
import path from 'path';
import { log } from '../logger';

export interface FeedbackTriggerDecision {
  shouldAsk: boolean;
  reason: string;
  score: number; // 0-100
  rateLimit: boolean;
  importance: 'low' | 'medium' | 'high';
}

export interface MessageContext {
  userId: string;
  messageLength: number;
  toolsUsed: string[];
  isError: boolean;
  commandType?: 'simple' | 'complex' | 'critical';
  responseTime?: number; // ms
  hasCode?: boolean;
  hasLinks?: boolean;
}

export class SmartFeedbackTrigger {
  private db: Database.Database;
  private readonly MAX_FEEDBACK_PER_DAY = 2;
  private readonly MIN_SCORE_TO_ASK = 60;

  constructor() {
    const dbPath = path.join(process.env.DATA_DIR || './data', 'ulf.db');
    this.db = new Database(dbPath);
    this.initTable();
    log.info('[SmartFeedbackTrigger] Initialized');
  }

  /**
   * Initialize table
   */
  private initTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feedback_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        importance TEXT NOT NULL,
        requested_at TEXT NOT NULL
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_feedback_requests_user_date 
      ON feedback_requests(user_id, requested_at);
    `);
  }

  /**
   * Decide if should ask for feedback
   */
  shouldAskFeedback(context: MessageContext): FeedbackTriggerDecision {
    // Check rate limit first
    const requestsToday = this.getRequestsToday(context.userId);
    const rateLimit = requestsToday >= this.MAX_FEEDBACK_PER_DAY;

    if (rateLimit) {
      return {
        shouldAsk: false,
        reason: 'Rate limit reached (max 2/day)',
        score: 0,
        rateLimit: true,
        importance: 'low',
      };
    }

    // Calculate importance score
    const score = this.calculateImportanceScore(context);
    const importance = this.getImportanceLevel(score);

    // Decide
    const shouldAsk = score >= this.MIN_SCORE_TO_ASK;
    const reason = shouldAsk
      ? `High importance (score: ${score})`
      : `Low importance (score: ${score} < ${this.MIN_SCORE_TO_ASK})`;

    return {
      shouldAsk,
      reason,
      score,
      rateLimit: false,
      importance,
    };
  }

  /**
   * Calculate importance score (0-100)
   */
  private calculateImportanceScore(context: MessageContext): number {
    let score = 0;

    // Base score for message length
    if (context.messageLength > 1000) {
      score += 20; // Long response = likely important
    } else if (context.messageLength > 500) {
      score += 10;
    } else if (context.messageLength < 100) {
      return 0; // Too short = trivial
    }

    // Tools used (big indicator of importance)
    const criticalTools = [
      'execute_shell',
      'replicate_generate_image',
      'replicate_generate_video',
      'github_pr',
      'github_deploy',
    ];
    const complexTools = [
      'web_fetch',
      'browser_navigate',
      'openai_generate_image',
    ];

    const hasCriticalTools = context.toolsUsed.some((t) =>
      criticalTools.includes(t)
    );
    const hasComplexTools = context.toolsUsed.some((t) =>
      complexTools.includes(t)
    );

    if (hasCriticalTools) {
      score += 40;
    } else if (hasComplexTools) {
      score += 25;
    } else if (context.toolsUsed.length > 0) {
      score += 15;
    }

    // Command type
    if (context.commandType === 'critical') {
      score += 30;
    } else if (context.commandType === 'complex') {
      score += 20;
    } else if (context.commandType === 'simple') {
      score += 5;
    }

    // Error handling
    if (context.isError) {
      score += 25; // Errors are important to get feedback on!
    }

    // Response time (if very long, might indicate complexity)
    if (context.responseTime && context.responseTime > 10000) {
      score += 10; // 10+ seconds = complex operation
    }

    // Has code blocks
    if (context.hasCode) {
      score += 10;
    }

    // Has links/resources
    if (context.hasLinks) {
      score += 5;
    }

    return Math.min(100, score);
  }

  /**
   * Get importance level
   */
  private getImportanceLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 80) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  }

  /**
   * Get feedback requests today
   */
  private getRequestsToday(userId: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM feedback_requests
      WHERE user_id = ? AND requested_at >= ?
    `
      )
      .get(userId, today.toISOString()) as any;

    return result?.count || 0;
  }

  /**
   * Record feedback request
   */
  recordRequest(userId: string, messageId: string, score: number, importance: string): void {
    const id = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.db
      .prepare(
        `
      INSERT INTO feedback_requests (
        id, user_id, message_id, score, importance, requested_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        userId,
        messageId,
        score,
        importance,
        new Date().toISOString()
      );

    log.info('[SmartFeedbackTrigger] Request recorded', {
      userId,
      score,
      importance,
    });
  }

  /**
   * Check if should ask for first interaction of the day
   */
  isFirstInteractionToday(userId: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM feedback_requests
      WHERE user_id = ? AND requested_at >= ?
    `
      )
      .get(userId, today.toISOString()) as any;

    return (result?.count || 0) === 0;
  }

  /**
   * Get stats
   */
  getStats(userId?: string): {
    totalRequests: number;
    todayRequests: number;
    avgScore: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = userId ? 'WHERE user_id = ?' : '';
    const params = userId ? [userId] : [];

    const total = this.db
      .prepare(`SELECT COUNT(*) as count FROM feedback_requests ${where}`)
      .get(...params) as any;

    const todayCount = this.db
      .prepare(
        `
      SELECT COUNT(*) as count FROM feedback_requests 
      ${where ? where + ' AND' : 'WHERE'} requested_at >= ?
    `
      )
      .get(...[...params, today.toISOString()]) as any;

    const avgScore = this.db
      .prepare(`SELECT AVG(score) as avg FROM feedback_requests ${where}`)
      .get(...params) as any;

    return {
      totalRequests: total?.count || 0,
      todayRequests: todayCount?.count || 0,
      avgScore: Math.round(avgScore?.avg || 0),
    };
  }
}

// Singleton
let smartFeedbackTriggerInstance: SmartFeedbackTrigger | null = null;

export function getSmartFeedbackTrigger(): SmartFeedbackTrigger {
  if (!smartFeedbackTriggerInstance) {
    smartFeedbackTriggerInstance = new SmartFeedbackTrigger();
  }
  return smartFeedbackTriggerInstance;
}

/**
 * Helper: Extract context from Discord message
 */
export function extractMessageContext(
  message: string,
  toolsUsed: string[],
  responseTimeMs?: number
): Omit<MessageContext, 'userId'> {
  const hasCode = /```/.test(message);
  const hasLinks = /https?:\/\//.test(message);
  const isError = /error|failed|❌|⚠️/i.test(message);

  // Detect command type based on content
  let commandType: 'simple' | 'complex' | 'critical' | undefined;

  const criticalKeywords = ['deploy', 'delete', 'remove', 'drop', 'production'];
  const complexKeywords = ['generate', 'create', 'analyze', 'build', 'search'];

  if (criticalKeywords.some((k) => message.toLowerCase().includes(k))) {
    commandType = 'critical';
  } else if (complexKeywords.some((k) => message.toLowerCase().includes(k))) {
    commandType = 'complex';
  } else if (message.length < 200 && toolsUsed.length === 0) {
    commandType = 'simple';
  }

  return {
    messageLength: message.length,
    toolsUsed,
    isError,
    commandType,
    responseTime: responseTimeMs,
    hasCode,
    hasLinks,
  };
}

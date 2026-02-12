/**
 * Feedback Analyzer
 * 
 * Analisa feedback dos usuários e gera propostas de melhoria.
 * 
 * Features:
 * - 📊 Pattern detection (agrupa feedback similar)
 * - 🎯 Priority scoring (urgência + impacto)
 * - 💡 Improvement generation (cria propostas concretas)
 * - 🔄 Integration with Self-Improvement
 * - 🤖 AI-powered analysis (Claude)
 * 
 * Flow:
 * 1. Coleta feedback em tempo real
 * 2. Detecta padrões (3+ feedbacks similares)
 * 3. Calcula prioridade (urgência × impacto × frequência)
 * 4. Gera proposta de melhoria com Claude
 * 5. Envia para Self-Improvement para implementação
 * 6. Notifica usuário quando implementado
 */

import Anthropic from '@anthropic-ai/sdk';
import { intervalManager } from '../utils/interval-manager';
import Database from 'better-sqlite3';
import path from 'path';
import { log } from '../logger';
import type { Feedback } from './interactive-feedback';

export interface FeedbackPattern {
  id: string;
  type: 'accuracy' | 'completeness' | 'clarity' | 'speed' | 'feature_request';
  description: string;
  occurrences: number;
  examples: string[];
  priority: number; // 1-100
  createdAt: Date;
  lastSeenAt: Date;
}

export interface ImprovementProposal {
  id: string;
  patternId: string;
  title: string;
  description: string;
  rationale: string;
  estimatedImpact: 'low' | 'medium' | 'high';
  estimatedEffort: 'low' | 'medium' | 'high';
  priority: number;
  status: 'proposed' | 'analyzing' | 'implementing' | 'testing' | 'deployed';
  createdAt: Date;
  implementedAt?: Date;
}

export class FeedbackAnalyzer {
  private db: Database.Database;
  private claude: Anthropic;
  private analysisQueue: Feedback[] = [];
  private analysisTimer: NodeJS.Timeout | null = null;

  constructor() {
    const dbPath = path.join(process.env.DATA_DIR || './data', 'ulf.db');
    this.db = new Database(dbPath);
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
    this.initTables();
    this.startAnalysisWorker();
    log.info('[FeedbackAnalyzer] Initialized');
  }

  /**
   * Initialize tables
   */
  private initTables(): void {
    // Patterns table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feedback_patterns (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        occurrences INTEGER DEFAULT 0,
        examples TEXT,
        priority INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      )
    `);

    // Proposals table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS improvement_proposals (
        id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        rationale TEXT NOT NULL,
        estimated_impact TEXT NOT NULL,
        estimated_effort TEXT NOT NULL,
        priority INTEGER NOT NULL,
        status TEXT DEFAULT 'proposed',
        created_at TEXT NOT NULL,
        implemented_at TEXT,
        FOREIGN KEY (pattern_id) REFERENCES feedback_patterns(id)
      )
    `);
  }

  /**
   * Analyze feedback (called from InteractiveFeedback)
   */
  analyzeFeedback(feedback: Feedback): void {
    log.info('[FeedbackAnalyzer] Queueing feedback for analysis', {
      feedbackId: feedback.id,
      rating: feedback.rating,
    });

    // Add to queue
    this.analysisQueue.push(feedback);

    // Process queue (batched)
    if (this.analysisQueue.length >= 5) {
      this.processQueue();
    }
  }

  /**
   * Start background analysis worker
   */
  private startAnalysisWorker(): void {
    // Process queue every 5 minutes
    this.analysisTimer = intervalManager.register('feedback-analyzer', () => {
      if (this.analysisQueue.length > 0) {
        this.processQueue();
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Process feedback queue
   */
  private async processQueue(): Promise<void> {
    const batch = this.analysisQueue.splice(0, 10);
    if (batch.length === 0) return;

    log.info('[FeedbackAnalyzer] Processing feedback batch', {
      count: batch.length,
    });

    for (const feedback of batch) {
      try {
        await this.analyzeOne(feedback);
      } catch (error: any) {
        log.error('[FeedbackAnalyzer] Analysis failed', {
          error: error.message,
          feedbackId: feedback.id,
        });
      }
    }

    // Check for patterns
    await this.detectPatterns();

    // Generate proposals for high-priority patterns
    await this.generateProposals();
  }

  /**
   * Analyze single feedback
   */
  private async analyzeOne(feedback: Feedback): Promise<void> {
    // Extract key information
    const text = [
      feedback.details,
      feedback.whatMissing,
      feedback.suggestion,
    ]
      .filter(Boolean)
      .join(' ');

    if (!text) return;

    // Use Claude to categorize and extract insights
    try {
      const response = await this.claude.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: `Analyze this user feedback and extract:
1. Type (accuracy/completeness/clarity/speed/feature_request)
2. Core issue (one sentence)
3. Suggested fix (one sentence)

Feedback: ${text}

Respond in JSON:
{
  "type": "...",
  "issue": "...",
  "fix": "..."
}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const analysis = JSON.parse(content.text);

        log.info('[FeedbackAnalyzer] Feedback analyzed', {
          feedbackId: feedback.id,
          type: analysis.type,
          issue: analysis.issue,
        });

        // Store pattern
        await this.recordPattern({
          type: analysis.type,
          description: analysis.issue,
          example: text,
        });
      }
    } catch (error: any) {
      log.error('[FeedbackAnalyzer] Claude analysis failed', {
        error: error.message,
      });
    }
  }

  /**
   * Record a pattern
   */
  private async recordPattern(input: {
    type: string;
    description: string;
    example: string;
  }): Promise<void> {
    // Check if similar pattern exists
    const existing = this.db
      .prepare(
        `
      SELECT * FROM feedback_patterns
      WHERE type = ? AND description LIKE ?
      LIMIT 1
    `
      )
      .get(input.type, `%${input.description.substring(0, 50)}%`) as any;

    if (existing) {
      // Update existing pattern
      const examples = JSON.parse(existing.examples || '[]');
      examples.push(input.example);

      this.db
        .prepare(
          `
        UPDATE feedback_patterns
        SET occurrences = occurrences + 1,
            examples = ?,
            last_seen_at = ?
        WHERE id = ?
      `
        )
        .run(
          JSON.stringify(examples.slice(-10)), // Keep last 10
          new Date().toISOString(),
          existing.id
        );

      log.info('[FeedbackAnalyzer] Pattern updated', {
        patternId: existing.id,
        occurrences: existing.occurrences + 1,
      });
    } else {
      // Create new pattern
      const id = `pattern-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      this.db
        .prepare(
          `
        INSERT INTO feedback_patterns (
          id, type, description, occurrences, examples,
          created_at, last_seen_at
        ) VALUES (?, ?, ?, 1, ?, ?, ?)
      `
        )
        .run(
          id,
          input.type,
          input.description,
          JSON.stringify([input.example]),
          new Date().toISOString(),
          new Date().toISOString()
        );

      log.info('[FeedbackAnalyzer] New pattern created', { patternId: id });
    }
  }

  /**
   * Detect significant patterns (3+ occurrences)
   */
  private async detectPatterns(): Promise<void> {
    const patterns = this.db
      .prepare(
        `
      SELECT * FROM feedback_patterns
      WHERE occurrences >= 3
      ORDER BY occurrences DESC, last_seen_at DESC
    `
      )
      .all() as any[];

    if (patterns.length === 0) return;

    log.info('[FeedbackAnalyzer] Significant patterns detected', {
      count: patterns.length,
    });

    // Calculate priority for each
    for (const pattern of patterns) {
      const priority = this.calculatePriority(pattern);

      this.db
        .prepare(
          `
        UPDATE feedback_patterns
        SET priority = ?
        WHERE id = ?
      `
        )
        .run(priority, pattern.id);
    }
  }

  /**
   * Calculate pattern priority
   */
  private calculatePriority(pattern: any): number {
    // Frequency (0-40 points)
    const frequency = Math.min(40, pattern.occurrences * 5);

    // Recency (0-30 points)
    const lastSeen = new Date(pattern.last_seen_at);
    const daysSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    const recency = Math.max(0, 30 - daysSince * 2);

    // Type weight (0-30 points)
    const typeWeights = {
      accuracy: 30,
      feature_request: 25,
      completeness: 20,
      clarity: 15,
      speed: 10,
    };
    const typeWeight = typeWeights[pattern.type as keyof typeof typeWeights] || 15;

    const priority = Math.round(frequency + recency + typeWeight);

    return Math.min(100, priority);
  }

  /**
   * Generate improvement proposals
   */
  private async generateProposals(): Promise<void> {
    // Get high-priority patterns without proposals
    const patterns = this.db
      .prepare(
        `
      SELECT p.* FROM feedback_patterns p
      LEFT JOIN improvement_proposals pr ON p.id = pr.pattern_id
      WHERE p.priority >= 60 AND pr.id IS NULL
      ORDER BY p.priority DESC
      LIMIT 3
    `
      )
      .all() as any[];

    if (patterns.length === 0) return;

    log.info('[FeedbackAnalyzer] Generating proposals', {
      count: patterns.length,
    });

    for (const pattern of patterns) {
      try {
        await this.generateProposal(pattern);
      } catch (error: any) {
        log.error('[FeedbackAnalyzer] Proposal generation failed', {
          error: error.message,
          patternId: pattern.id,
        });
      }
    }
  }

  /**
   * Generate single improvement proposal
   */
  private async generateProposal(pattern: any): Promise<void> {
    const examples = JSON.parse(pattern.examples || '[]');

    // Use Claude to generate proposal
    const response = await this.claude.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `You are a senior software engineer reviewing user feedback for an AI agent.

Pattern detected:
- Type: ${pattern.type}
- Description: ${pattern.description}
- Occurrences: ${pattern.occurrences}
- Examples: ${examples.slice(0, 3).join('\n')}

Generate a concrete improvement proposal:

1. **Title**: Short, actionable title
2. **Description**: What to implement (1-2 paragraphs)
3. **Rationale**: Why this matters (business/user impact)
4. **Implementation**: High-level approach
5. **Impact**: low/medium/high
6. **Effort**: low/medium/high

Respond in JSON:
{
  "title": "...",
  "description": "...",
  "rationale": "...",
  "implementation": "...",
  "impact": "...",
  "effort": "..."
}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') return;

    const proposal = JSON.parse(content.text);

    // Save proposal
    const id = `proposal-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    this.db
      .prepare(
        `
      INSERT INTO improvement_proposals (
        id, pattern_id, title, description, rationale,
        estimated_impact, estimated_effort, priority,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'proposed', ?)
    `
      )
      .run(
        id,
        pattern.id,
        proposal.title,
        `${proposal.description}\n\n**Implementation:**\n${proposal.implementation}`,
        proposal.rationale,
        proposal.impact,
        proposal.effort,
        pattern.priority,
        new Date().toISOString()
      );

    log.info('[FeedbackAnalyzer] Proposal generated', {
      proposalId: id,
      title: proposal.title,
    });

    // Send to self-improvement system
    this.sendToSelfImprovement(id, proposal);
  }

  /**
   * Send proposal to self-improvement system
   */
  private async sendToSelfImprovement(
    proposalId: string,
    proposal: any
  ): Promise<void> {
    // TODO: Re-integrate with self-improvement system after refactor
    // Need channel parameter which is not available in this context
    log.info('[FeedbackAnalyzer] Self-improvement integration disabled (needs refactor)', { 
      proposalId 
    });
  }

  /**
   * Get stats
   */
  getStats(): {
    patterns: number;
    proposals: number;
    avgPriority: number;
  } {
    const patterns = this.db
      .prepare('SELECT COUNT(*) as count FROM feedback_patterns')
      .get() as any;

    const proposals = this.db
      .prepare('SELECT COUNT(*) as count FROM improvement_proposals')
      .get() as any;

    const avgPriority = this.db
      .prepare(
        `
      SELECT AVG(priority) as avg FROM feedback_patterns
      WHERE occurrences >= 3
    `
      )
      .get() as any;

    return {
      patterns: patterns.count,
      proposals: proposals.count,
      avgPriority: Math.round(avgPriority?.avg || 0),
    };
  }

  /**
   * Shutdown
   */
  shutdown(): void {
    if (this.analysisTimer) {
      intervalManager.clear('feedback-analyzer');
    }
  }
}

// Singleton
let feedbackAnalyzerInstance: FeedbackAnalyzer | null = null;

export function getFeedbackAnalyzer(): FeedbackAnalyzer {
  if (!feedbackAnalyzerInstance) {
    feedbackAnalyzerInstance = new FeedbackAnalyzer();
  }
  return feedbackAnalyzerInstance;
}

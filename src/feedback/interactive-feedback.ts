/**
 * Interactive Feedback System
 * 
 * Sistema de feedback inteligente que coleta opiniões do usuário
 * e alimenta o self-improvement system.
 * 
 * Features:
 * - 👍 👎 Quick feedback buttons
 * - ⭐ Star ratings (1-5)
 * - 📝 Detailed feedback (modal)
 * - 🎯 Category selection
 * - 🔄 Integration with Self-Improvement
 * 
 * Flow:
 * 1. Bot responde → Mostra botões de feedback
 * 2. User clica → Abre modal ou processa direto
 * 3. Feedback é analisado
 * 4. Se útil → Vira improvement proposal
 * 5. Bot implementa → Pede user review
 * 6. Approved → Deploy automático!
 */

import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonInteraction,
  ModalSubmitInteraction,
  Message
} from 'discord.js';
import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../logger';

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  messageId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  helpful: boolean;
  category?: 'accuracy' | 'completeness' | 'clarity' | 'speed' | 'other';
  details?: string;
  whatMissing?: string;
  suggestion?: string;
  createdAt: Date;
  improvementProposalId?: string;
}

export interface FeedbackStats {
  total: number;
  helpful: number;
  notHelpful: number;
  avgRating: number;
  byCategory: Record<string, number>;
  topSuggestions: Array<{ suggestion: string; count: number }>;
}

export class InteractiveFeedback {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.env.DATA_DIR || './data', 'ulf.db');
    this.db = new Database(dbPath);
    this.initTable();
    log.info('[InteractiveFeedback] Initialized');
  }

  /**
   * Initialize feedback table
   */
  private initTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        message_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        helpful INTEGER NOT NULL,
        category TEXT,
        details TEXT,
        what_missing TEXT,
        suggestion TEXT,
        created_at TEXT NOT NULL,
        improvement_proposal_id TEXT
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
      CREATE INDEX IF NOT EXISTS idx_feedback_helpful ON feedback(helpful);
      CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);
    `);
  }

  /**
   * Add feedback buttons to a message
   * 
   * IMPORTANTE: Só chamar quando smartTrigger.shouldAskFeedback() retornar true!
   */
  addFeedbackButtons(messageId: string, compact: boolean = false): ActionRowBuilder<ButtonBuilder>[] {
    if (compact) {
      // Compact mode: Only 2 buttons for less intrusive
      const feedbackRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`feedback_helpful_${messageId}`)
          .setLabel('👍')
          .setStyle(ButtonStyle.Success),
        
        new ButtonBuilder()
          .setCustomId(`feedback_not_helpful_${messageId}`)
          .setLabel('👎')
          .setStyle(ButtonStyle.Danger),
        
        new ButtonBuilder()
          .setCustomId(`feedback_suggest_${messageId}`)
          .setLabel('💡 Suggest')
          .setStyle(ButtonStyle.Secondary)
      );

      return [feedbackRow];
    }

    // Full mode: All buttons (usado quando user pede explicitamente)
    const feedbackRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`feedback_helpful_${messageId}`)
        .setLabel('👍 Helpful')
        .setStyle(ButtonStyle.Success),
      
      new ButtonBuilder()
        .setCustomId(`feedback_not_helpful_${messageId}`)
        .setLabel('👎 Not Helpful')
        .setStyle(ButtonStyle.Danger),
      
      new ButtonBuilder()
        .setCustomId(`feedback_detailed_${messageId}`)
        .setLabel('📝 Give Feedback')
        .setStyle(ButtonStyle.Primary),
      
      new ButtonBuilder()
        .setCustomId(`feedback_suggest_${messageId}`)
        .setLabel('💡 Suggest Improvement')
        .setStyle(ButtonStyle.Secondary)
    );

    return [feedbackRow];
  }

  /**
   * Create on-demand feedback buttons (for /feedback command)
   */
  createFeedbackPrompt(messageId: string): {
    content: string;
    components: ActionRowBuilder<ButtonBuilder>[];
  } {
    return {
      content: '📊 **How was my response?** Your feedback helps me improve!',
      components: this.addFeedbackButtons(messageId, false),
    };
  }

  /**
   * Handle feedback button click
   */
  async handleFeedbackButton(interaction: ButtonInteraction): Promise<void> {
    const [action, type, messageId] = interaction.customId.split('_');

    if (action !== 'feedback') return;

    try {
      switch (type) {
        case 'helpful':
          await this.handleQuickFeedback(interaction, messageId, true, 5);
          break;

        case 'not':
          // "not_helpful" - split ate 3 parts
          await this.handleQuickFeedback(interaction, messageId, false, 2);
          break;

        case 'detailed':
          await this.showDetailedFeedbackModal(interaction, messageId);
          break;

        case 'suggest':
          await this.showSuggestionModal(interaction, messageId);
          break;
      }
    } catch (error: any) {
      log.error('[InteractiveFeedback] Button handler failed', {
        error: error.message,
        customId: interaction.customId,
      });
    }
  }

  /**
   * Handle quick feedback (thumbs up/down)
   */
  private async handleQuickFeedback(
    interaction: ButtonInteraction,
    messageId: string,
    helpful: boolean,
    rating: number
  ): Promise<void> {
    // Save feedback
    const feedback = await this.saveFeedback({
      userId: interaction.user.id,
      userName: interaction.user.username,
      messageId,
      rating: rating as 1 | 2 | 3 | 4 | 5,
      helpful,
    });

    log.info('[InteractiveFeedback] Quick feedback received', {
      feedbackId: feedback.id,
      helpful,
      rating,
    });

    // Reply
    await interaction.reply({
      content: helpful
        ? '✅ Thanks for the feedback! Glad I could help! 😊'
        : '❌ Sorry I couldn\'t help better. Want to tell me what was missing? Click "📝 Give Feedback"',
      ephemeral: true,
    });

    // If not helpful, trigger analysis
    if (!helpful) {
      this.triggerImprovementAnalysis(feedback);
    }
  }

  /**
   * Show detailed feedback modal
   */
  private async showDetailedFeedbackModal(
    interaction: ButtonInteraction,
    messageId: string
  ): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(`feedback_modal_${messageId}`)
      .setTitle('📝 Detailed Feedback');

    // Rating (1-5)
    const ratingInput = new TextInputBuilder()
      .setCustomId('rating')
      .setLabel('Rating (1-5 stars)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter 1, 2, 3, 4, or 5')
      .setMinLength(1)
      .setMaxLength(1)
      .setRequired(true);

    // What was missing?
    const missingInput = new TextInputBuilder()
      .setCustomId('missing')
      .setLabel('What was missing or unclear?')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('E.g., "Needed more examples", "Too technical"...')
      .setRequired(false);

    // Details
    const detailsInput = new TextInputBuilder()
      .setCustomId('details')
      .setLabel('Additional details')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Any other comments...')
      .setRequired(false);

    const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(ratingInput);
    const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(missingInput);
    const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(detailsInput);

    modal.addComponents(row1, row2, row3);

    await interaction.showModal(modal);
  }

  /**
   * Show suggestion modal
   */
  private async showSuggestionModal(
    interaction: ButtonInteraction,
    messageId: string
  ): Promise<void> {
    const modal = new ModalBuilder()
      .setCustomId(`suggestion_modal_${messageId}`)
      .setTitle('💡 Suggest an Improvement');

    // Suggestion
    const suggestionInput = new TextInputBuilder()
      .setCustomId('suggestion')
      .setLabel('What should I improve?')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('E.g., "Add support for X", "Explain Y better", "Show Z differently"...')
      .setRequired(true);

    // Why important?
    const whyInput = new TextInputBuilder()
      .setCustomId('why')
      .setLabel('Why is this important?')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('This would help because...')
      .setRequired(false);

    const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(suggestionInput);
    const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(whyInput);

    modal.addComponents(row1, row2);

    await interaction.showModal(modal);
  }

  /**
   * Handle modal submission
   */
  async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const [type, _, messageId] = interaction.customId.split('_');

    try {
      if (type === 'feedback') {
        await this.handleDetailedFeedbackSubmit(interaction, messageId);
      } else if (type === 'suggestion') {
        await this.handleSuggestionSubmit(interaction, messageId);
      }
    } catch (error: any) {
      log.error('[InteractiveFeedback] Modal submit failed', {
        error: error.message,
        customId: interaction.customId,
      });
    }
  }

  /**
   * Handle detailed feedback submission
   */
  private async handleDetailedFeedbackSubmit(
    interaction: ModalSubmitInteraction,
    messageId: string
  ): Promise<void> {
    const rating = parseInt(interaction.fields.getTextInputValue('rating'));
    const missing = interaction.fields.getTextInputValue('missing');
    const details = interaction.fields.getTextInputValue('details');

    // Validate rating
    if (rating < 1 || rating > 5) {
      await interaction.reply({
        content: '❌ Rating must be between 1 and 5!',
        ephemeral: true,
      });
      return;
    }

    // Save feedback
    const feedback = await this.saveFeedback({
      userId: interaction.user.id,
      userName: interaction.user.username,
      messageId,
      rating: rating as 1 | 2 | 3 | 4 | 5,
      helpful: rating >= 4,
      whatMissing: missing || undefined,
      details: details || undefined,
    });

    log.info('[InteractiveFeedback] Detailed feedback received', {
      feedbackId: feedback.id,
      rating,
    });

    await interaction.reply({
      content: `✅ Thanks for the ${rating}-star feedback! ${
        rating >= 4 ? '😊' : 'I\'ll work on improving!'
      }`,
      ephemeral: true,
    });

    // If low rating, trigger improvement
    if (rating <= 3) {
      this.triggerImprovementAnalysis(feedback);
    }
  }

  /**
   * Handle suggestion submission
   */
  private async handleSuggestionSubmit(
    interaction: ModalSubmitInteraction,
    messageId: string
  ): Promise<void> {
    const suggestion = interaction.fields.getTextInputValue('suggestion');
    const why = interaction.fields.getTextInputValue('why');

    // Save as feedback with suggestion
    const feedback = await this.saveFeedback({
      userId: interaction.user.id,
      userName: interaction.user.username,
      messageId,
      rating: 3,
      helpful: false,
      suggestion,
      details: why || undefined,
    });

    log.info('[InteractiveFeedback] Suggestion received', {
      feedbackId: feedback.id,
      suggestion: suggestion.substring(0, 100),
    });

    await interaction.reply({
      content: '💡 Thanks for the suggestion! I\'ll analyze it and see if I can implement it!',
      ephemeral: true,
    });

    // Trigger improvement analysis
    this.triggerImprovementAnalysis(feedback);
  }

  /**
   * Save feedback to database
   */
  private async saveFeedback(input: {
    userId: string;
    userName: string;
    messageId: string;
    rating: 1 | 2 | 3 | 4 | 5;
    helpful: boolean;
    category?: string;
    details?: string;
    whatMissing?: string;
    suggestion?: string;
  }): Promise<Feedback> {
    const id = uuidv4();
    const now = new Date();

    const feedback: Feedback = {
      id,
      userId: input.userId,
      userName: input.userName,
      messageId: input.messageId,
      rating: input.rating,
      helpful: input.helpful,
      category: input.category as any,
      details: input.details,
      whatMissing: input.whatMissing,
      suggestion: input.suggestion,
      createdAt: now,
    };

    this.db
      .prepare(
        `
      INSERT INTO feedback (
        id, user_id, user_name, message_id, rating, helpful,
        category, details, what_missing, suggestion, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        feedback.id,
        feedback.userId,
        feedback.userName,
        feedback.messageId,
        feedback.rating,
        feedback.helpful ? 1 : 0,
        feedback.category || null,
        feedback.details || null,
        feedback.whatMissing || null,
        feedback.suggestion || null,
        feedback.createdAt.toISOString()
      );

    return feedback;
  }

  /**
   * Trigger improvement analysis
   * 
   * This will be integrated with the Self-Improvement system
   */
  private triggerImprovementAnalysis(feedback: Feedback): void {
    // Import dynamically to avoid circular deps
    import('./feedback-analyzer').then((module) => {
      const analyzer = module.getFeedbackAnalyzer();
      analyzer.analyzeFeedback(feedback);
    }).catch((error) => {
      log.error('[InteractiveFeedback] Failed to import feedback analyzer', {
        error: error.message
      });
    });
  }

  /**
   * Get feedback stats
   */
  getStats(days: number = 7): FeedbackStats {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = this.db
      .prepare(
        `
      SELECT * FROM feedback 
      WHERE created_at >= ?
    `
      )
      .all(since.toISOString()) as any[];

    const total = rows.length;
    const helpful = rows.filter((r) => r.helpful === 1).length;
    const notHelpful = total - helpful;
    const avgRating =
      rows.reduce((sum, r) => sum + r.rating, 0) / (total || 1);

    const byCategory: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.category) {
        byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      }
    });

    // Top suggestions
    const suggestionCounts: Record<string, number> = {};
    rows.forEach((r) => {
      if (r.suggestion) {
        suggestionCounts[r.suggestion] = (suggestionCounts[r.suggestion] || 0) + 1;
      }
    });

    const topSuggestions = Object.entries(suggestionCounts)
      .map(([suggestion, count]) => ({ suggestion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      helpful,
      notHelpful,
      avgRating,
      byCategory,
      topSuggestions,
    };
  }

  /**
   * Get recent feedback
   */
  getRecent(limit: number = 10): Feedback[] {
    const rows = this.db
      .prepare(
        `
      SELECT * FROM feedback
      ORDER BY created_at DESC
      LIMIT ?
    `
      )
      .all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      userName: r.user_name,
      messageId: r.message_id,
      rating: r.rating,
      helpful: Boolean(r.helpful),
      category: r.category,
      details: r.details,
      whatMissing: r.what_missing,
      suggestion: r.suggestion,
      createdAt: new Date(r.created_at),
      improvementProposalId: r.improvement_proposal_id,
    }));
  }
}

// Singleton
let interactiveFeedbackInstance: InteractiveFeedback | null = null;

export function getInteractiveFeedback(): InteractiveFeedback {
  if (!interactiveFeedbackInstance) {
    interactiveFeedbackInstance = new InteractiveFeedback();
  }
  return interactiveFeedbackInstance;
}

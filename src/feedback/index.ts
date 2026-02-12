/**
 * Feedback System - Main Export
 * 
 * Sistema completo de feedback evolutivo:
 * 
 * 1. SmartTrigger: Decide QUANDO pedir feedback
 * 2. InteractiveFeedback: Coleta feedback do usuário
 * 3. FeedbackAnalyzer: Analisa padrões e gera proposals
 * 4. Integration: Envia para Self-Improvement
 * 
 * Usage:
 * 
 * ```typescript
 * import { feedbackSystem } from './feedback';
 * 
 * // After bot responds
 * const decision = feedbackSystem.shouldAddButtons(context);
 * if (decision.shouldAsk) {
 *   const buttons = feedbackSystem.getButtons(messageId);
 *   await message.reply({ content, components: buttons });
 * }
 * 
 * // On button click
 * await feedbackSystem.handleButtonClick(interaction);
 * 
 * // On /feedback command
 * await feedbackSystem.handleFeedbackCommand(message);
 * ```
 */

import { ButtonInteraction, ModalSubmitInteraction, Message } from 'discord.js';
import { getSmartFeedbackTrigger, extractMessageContext, type MessageContext } from './smart-feedback-trigger';
import { getInteractiveFeedback } from './interactive-feedback';
import { getFeedbackAnalyzer } from './feedback-analyzer';
import { log } from '../logger';

export class FeedbackSystem {
  private smartTrigger = getSmartFeedbackTrigger();
  private interactiveFeedback = getInteractiveFeedback();
  private analyzer = getFeedbackAnalyzer();

  /**
   * Decide if should add feedback buttons to a message
   */
  shouldAddButtons(context: MessageContext): {
    shouldAsk: boolean;
    reason: string;
    score: number;
  } {
    const decision = this.smartTrigger.shouldAskFeedback(context);
    
    if (decision.shouldAsk) {
      // Record that we're asking
      this.smartTrigger.recordRequest(
        context.userId,
        'pending',
        decision.score,
        decision.importance
      );
    }

    return {
      shouldAsk: decision.shouldAsk,
      reason: decision.reason,
      score: decision.score,
    };
  }

  /**
   * Get feedback buttons (compact mode by default)
   */
  getButtons(messageId: string, compact: boolean = true) {
    return this.interactiveFeedback.addFeedbackButtons(messageId, compact);
  }

  /**
   * Handle feedback button click
   */
  async handleButtonClick(interaction: ButtonInteraction): Promise<void> {
    await this.interactiveFeedback.handleFeedbackButton(interaction);
  }

  /**
   * Handle modal submission
   */
  async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    await this.interactiveFeedback.handleModalSubmit(interaction);
  }

  /**
   * Handle /feedback command (on-demand feedback)
   */
  async handleFeedbackCommand(message: Message): Promise<void> {
    // Get the last bot message in this channel
    const messages = await message.channel.messages.fetch({ limit: 10 });
    const lastBotMessage = messages.find(
      (m) => m.author.bot && m.author.id === message.client.user?.id
    );

    if (!lastBotMessage) {
      await message.reply('❌ No recent bot message found to give feedback on!');
      return;
    }

    // Show feedback prompt
    const prompt = this.interactiveFeedback.createFeedbackPrompt(lastBotMessage.id);
    
    await message.reply({
      content: prompt.content,
      components: prompt.components,
    });

    log.info('[FeedbackSystem] Manual feedback requested', {
      userId: message.author.id,
      messageId: lastBotMessage.id,
    });
  }

  /**
   * Get stats
   */
  getStats(userId?: string) {
    const triggerStats = this.smartTrigger.getStats(userId);
    const feedbackStats = this.interactiveFeedback.getStats(7);
    const analyzerStats = this.analyzer.getStats();

    return {
      trigger: triggerStats,
      feedback: feedbackStats,
      analyzer: analyzerStats,
    };
  }
}

// Singleton
let feedbackSystemInstance: FeedbackSystem | null = null;

export function getFeedbackSystem(): FeedbackSystem {
  if (!feedbackSystemInstance) {
    feedbackSystemInstance = new FeedbackSystem();
  }
  return feedbackSystemInstance;
}

// Re-export types
export type { MessageContext } from './smart-feedback-trigger';
export { extractMessageContext } from './smart-feedback-trigger';

// Default export
export const feedbackSystem = getFeedbackSystem();

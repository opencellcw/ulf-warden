import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { log } from '../logger';

/**
 * Context Window Compaction
 *
 * Automatically manages context window to prevent hitting Claude's limits.
 * When approaching the limit, compacts old messages by:
 * 1. Summarizing conversation history
 * 2. Keeping only recent messages
 * 3. Preserving system-critical context
 *
 * Configuration:
 * - Model max tokens: 200k (Claude Sonnet 4)
 * - Reserved tokens: 30k (for response + tools)
 * - Usable tokens: 170k
 * - Compaction threshold: 150k (trigger at 88% usage)
 */

interface CompactionConfig {
  modelMaxTokens: number;
  reservedTokens: number;
  compactionThreshold: number;
  recentMessagesToKeep: number;
}

interface CompactionResult {
  compacted: boolean;
  originalCount: number;
  compactedCount: number;
  originalTokens: number;
  compactedTokens: number;
  summary?: string;
}

export class ContextCompactor {
  private config: CompactionConfig;
  private client: Anthropic;

  constructor(client: Anthropic, config?: Partial<CompactionConfig>) {
    this.client = client;
    this.config = {
      modelMaxTokens: 200_000, // Claude Sonnet 4
      reservedTokens: 30_000, // Reserve for response + tools
      compactionThreshold: 150_000, // Trigger at 150k tokens (88% of usable)
      recentMessagesToKeep: 10, // Keep last 10 messages uncompacted
      ...config
    };

    log.info('[ContextCompactor] Initialized', {
      modelMaxTokens: this.config.modelMaxTokens,
      reservedTokens: this.config.reservedTokens,
      usableTokens: this.config.modelMaxTokens - this.config.reservedTokens,
      compactionThreshold: this.config.compactionThreshold,
      recentMessagesToKeep: this.config.recentMessagesToKeep
    });
  }

  /**
   * Check if compaction is needed and compact if necessary
   */
  async checkAndCompact(
    messages: MessageParam[],
    systemPrompt?: string
  ): Promise<{ messages: MessageParam[]; result: CompactionResult }> {
    const tokenCount = this.estimateTokens(messages, systemPrompt);

    log.info('[ContextCompactor] Checking context size', {
      messageCount: messages.length,
      estimatedTokens: tokenCount,
      threshold: this.config.compactionThreshold,
      needsCompaction: tokenCount > this.config.compactionThreshold
    });

    if (tokenCount <= this.config.compactionThreshold) {
      return {
        messages,
        result: {
          compacted: false,
          originalCount: messages.length,
          compactedCount: messages.length,
          originalTokens: tokenCount,
          compactedTokens: tokenCount
        }
      };
    }

    // Compaction needed
    log.warn('[ContextCompactor] Context too large, compacting', {
      currentTokens: tokenCount,
      threshold: this.config.compactionThreshold
    });

    const compactedMessages = await this.compact(messages);
    const compactedTokens = this.estimateTokens(compactedMessages, systemPrompt);

    const result: CompactionResult = {
      compacted: true,
      originalCount: messages.length,
      compactedCount: compactedMessages.length,
      originalTokens: tokenCount,
      compactedTokens: compactedTokens
    };

    log.info('[ContextCompactor] Compaction complete', result);

    return { messages: compactedMessages, result };
  }

  /**
   * Compact messages by summarizing old context
   */
  private async compact(messages: MessageParam[]): Promise<MessageParam[]> {
    const keepRecent = this.config.recentMessagesToKeep;

    // Split messages: old (to compact) and recent (to keep)
    const oldMessages = messages.slice(0, -keepRecent);
    const recentMessages = messages.slice(-keepRecent);

    if (oldMessages.length === 0) {
      // If we can't compact further, just return recent messages
      log.warn('[ContextCompactor] Cannot compact further, keeping only recent messages', {
        recentCount: recentMessages.length
      });
      return recentMessages;
    }

    log.info('[ContextCompactor] Summarizing old messages', {
      oldCount: oldMessages.length,
      recentCount: recentMessages.length
    });

    // Summarize old messages
    const summary = await this.summarizeMessages(oldMessages);

    // Create a single summarized message
    const summaryMessage: MessageParam = {
      role: 'user',
      content: `[Previous conversation summary - ${oldMessages.length} messages compacted]\n\n${summary}`
    };

    // Return summary + recent messages
    return [summaryMessage, ...recentMessages];
  }

  /**
   * Summarize messages using Claude (fast Haiku model)
   */
  private async summarizeMessages(messages: MessageParam[]): Promise<string> {
    try {
      // Convert messages to text format for summarization
      const conversationText = messages
        .map((msg, idx) => {
          const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          return `[${idx + 1}] ${msg.role}: ${content}`;
        })
        .join('\n\n');

      const response = await this.client.messages.create({
        model: 'claude-opus-4-5-20251101', // Most capable for summarization (Opus 4.5)
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Summarize this conversation history concisely, preserving key information, decisions, and context. Focus on what's relevant for future interactions.

Conversation to summarize:
${conversationText}

Provide a clear, structured summary highlighting:
1. Main topics discussed
2. Key decisions made
3. Important context to preserve
4. Action items or pending tasks`
          }
        ]
      });

      const summary = response.content[0].type === 'text' ? response.content[0].text : '';

      log.info('[ContextCompactor] Summary generated', {
        originalLength: conversationText.length,
        summaryLength: summary.length,
        compressionRatio: (summary.length / conversationText.length * 100).toFixed(1) + '%'
      });

      return summary;
    } catch (error: any) {
      log.error('[ContextCompactor] Failed to generate summary', { error: error.message });

      // Fallback: simple text summary
      return this.simpleSummary(messages);
    }
  }

  /**
   * Fallback simple summary (no API call)
   */
  private simpleSummary(messages: MessageParam[]): string {
    const messageCount = messages.length;
    const userMessages = messages.filter(m => m.role === 'user').length;
    const assistantMessages = messages.filter(m => m.role === 'assistant').length;

    // Extract key topics (simple keyword extraction)
    const allContent = messages
      .map(m => (typeof m.content === 'string' ? m.content : ''))
      .join(' ');

    return `Previous conversation summary:
- ${messageCount} messages exchanged (${userMessages} from user, ${assistantMessages} from assistant)
- Topics covered: Various discussions and interactions
- Context preserved for continuity`;
  }

  /**
   * Estimate token count for messages
   * Uses rough estimation: ~4 chars per token (OpenAI tokenizer approximation)
   */
  private estimateTokens(messages: MessageParam[], systemPrompt?: string): number {
    let totalChars = 0;

    // Count system prompt
    if (systemPrompt) {
      totalChars += systemPrompt.length;
    }

    // Count message content
    for (const message of messages) {
      if (typeof message.content === 'string') {
        totalChars += message.content.length;
      } else if (Array.isArray(message.content)) {
        // Content blocks
        for (const block of message.content) {
          if ('text' in block) {
            totalChars += block.text.length;
          } else if ('source' in block && 'data' in block.source) {
            // Image data (rough estimate)
            totalChars += 1000; // Images typically 1000-2000 tokens
          }
        }
      }

      // Add overhead for role and structure
      totalChars += 50;
    }

    // Convert chars to tokens (rough: 1 token ≈ 4 chars)
    const estimatedTokens = Math.ceil(totalChars / 4);

    return estimatedTokens;
  }

  /**
   * Get current configuration
   */
  getConfig(): CompactionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<CompactionConfig>): void {
    this.config = { ...this.config, ...config };
    log.info('[ContextCompactor] Configuration updated', this.config);
  }
}

/**
 * Global instance (initialized in agent.ts)
 */
let compactorInstance: ContextCompactor | null = null;

export function initializeContextCompactor(client: Anthropic, config?: Partial<CompactionConfig>): void {
  compactorInstance = new ContextCompactor(client, config);
  log.info('[ContextCompactor] Global instance initialized');
}

export function getContextCompactor(): ContextCompactor {
  if (!compactorInstance) {
    throw new Error('ContextCompactor not initialized. Call initializeContextCompactor() first.');
  }
  return compactorInstance;
}

/**
 * Convenience function: check and compact if needed
 */
export async function checkAndCompactContext(
  messages: MessageParam[],
  systemPrompt?: string
): Promise<{ messages: MessageParam[]; result: CompactionResult }> {
  const compactor = getContextCompactor();
  return await compactor.checkAndCompact(messages, systemPrompt);
}

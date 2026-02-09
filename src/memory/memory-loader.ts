import { dailyLogger } from './daily-logger';
import { log } from '../logger';

/**
 * Memory Loader
 *
 * Loads relevant memory context for agent conversations.
 * Includes recent daily logs and searched memory for specific topics.
 */

export interface MemoryContext {
  recentLogs: string;
  searchResults?: string;
  summary: string;
}

export class MemoryLoader {
  /**
   * Load recent memory context (last N days)
   */
  async loadRecentContext(days: number = 3): Promise<MemoryContext> {
    try {
      const recentLogs = await dailyLogger.getRecentLogs(days);

      if (recentLogs.length === 0) {
        return {
          recentLogs: '',
          summary: 'No recent memory available.'
        };
      }

      // Format logs for context
      const formattedLogs = recentLogs
        .map(({ date, content }) => {
          // Extract key sections (skip template comments)
          const cleaned = content
            .split('\n')
            .filter(line => !line.includes('<!--') && !line.includes('-->'))
            .filter(line => line.trim().length > 0)
            .join('\n');

          return `### ${date}\n${cleaned}`;
        })
        .join('\n\n');

      const summary = `Recent memory (last ${days} days) with ${recentLogs.length} log files.`;

      log.debug('[MemoryLoader] Recent context loaded', {
        days,
        files: recentLogs.length,
        size: formattedLogs.length
      });

      return {
        recentLogs: formattedLogs,
        summary
      };
    } catch (error: any) {
      log.error('[MemoryLoader] Failed to load recent context', { error: error.message });
      return {
        recentLogs: '',
        summary: 'Failed to load recent memory.'
      };
    }
  }

  /**
   * Search memory for specific topics/keywords
   */
  async searchMemory(keyword: string, days: number = 30): Promise<string> {
    try {
      const results = await dailyLogger.searchLogs(keyword, days);

      if (results.length === 0) {
        return `No results found for "${keyword}" in the last ${days} days.`;
      }

      const formatted = results
        .map(({ date, matches }) => {
          const preview = matches.slice(0, 3).join('\n');
          return `**${date}** (${matches.length} matches):\n${preview}`;
        })
        .join('\n\n');

      log.debug('[MemoryLoader] Search complete', {
        keyword,
        results: results.length
      });

      return `Search results for "${keyword}":\n\n${formatted}`;
    } catch (error: any) {
      log.error('[MemoryLoader] Search failed', { error: error.message });
      return `Failed to search memory for "${keyword}".`;
    }
  }

  /**
   * Load context for specific user (personalized memory)
   */
  async loadUserContext(userId: string, days: number = 3): Promise<string> {
    try {
      const recentLogs = await dailyLogger.getRecentLogs(days);

      const userLogs = recentLogs
        .map(({ date, content }) => {
          // Extract lines mentioning this user
          const userLines = content
            .split('\n')
            .filter(line => line.includes(userId))
            .filter(line => !line.includes('<!--'));

          if (userLines.length > 0) {
            return `**${date}**:\n${userLines.slice(0, 5).join('\n')}`;
          }
          return null;
        })
        .filter(Boolean)
        .join('\n\n');

      if (!userLogs) {
        return `No recent interactions found for user ${userId}.`;
      }

      log.debug('[MemoryLoader] User context loaded', { userId, days });

      return `Recent interactions with ${userId}:\n\n${userLogs}`;
    } catch (error: any) {
      log.error('[MemoryLoader] Failed to load user context', { error: error.message });
      return `Failed to load context for ${userId}.`;
    }
  }

  /**
   * Get formatted memory context for system prompt
   */
  async getMemoryPrompt(options?: {
    includeDays?: number;
    searchKeyword?: string;
    userId?: string;
  }): Promise<string> {
    const parts: string[] = [];

    // Recent logs
    const recentContext = await this.loadRecentContext(options?.includeDays || 3);
    if (recentContext.recentLogs) {
      parts.push('# RECENT MEMORY (Last 3 Days)\n\n');
      parts.push(recentContext.recentLogs);
    }

    // Search results
    if (options?.searchKeyword) {
      const searchResults = await this.searchMemory(options.searchKeyword);
      parts.push('\n\n# RELEVANT MEMORY\n\n');
      parts.push(searchResults);
    }

    // User-specific context
    if (options?.userId) {
      const userContext = await this.loadUserContext(options.userId);
      parts.push('\n\n# USER HISTORY\n\n');
      parts.push(userContext);
    }

    return parts.join('');
  }

  /**
   * Check if memory context is too large
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Trim memory context if too large
   */
  trimContext(context: string, maxTokens: number = 4000): string {
    const maxChars = maxTokens * 4;
    if (context.length <= maxChars) {
      return context;
    }

    // Trim and add note
    const trimmed = context.substring(0, maxChars);
    const lastNewline = trimmed.lastIndexOf('\n');
    const result = trimmed.substring(0, lastNewline > 0 ? lastNewline : maxChars);

    log.info('[MemoryLoader] Context trimmed', {
      original: context.length,
      trimmed: result.length,
      tokensEstimate: this.estimateTokens(result)
    });

    return result + '\n\n_[Memory context trimmed due to size]_';
  }
}

// Export singleton
export const memoryLoader = new MemoryLoader();

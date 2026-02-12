import { log } from '../logger';
import { memory } from '../memory/vector-memory';

/**
 * Unified Search System
 * 
 * Search across ALL data sources simultaneously:
 * - Conversation history
 * - Pinecone memory
 * - GitHub (issues, PRs, code)
 * - Slack threads
 * - Google Drive
 * - Notion pages
 * 
 * Example:
 *   /search "kubernetes error"
 *   → Searches everywhere at once!
 * 
 * = Universal search! 🔍
 */

export interface SearchResult {
  id: string;
  source: 'conversation' | 'memory' | 'github' | 'slack' | 'drive' | 'notion';
  title: string;
  snippet: string;
  url?: string;
  relevance: number; // 0-1
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  sources?: string[]; // Which sources to search
  limit?: number; // Max results per source
  minRelevance?: number; // Min relevance score
  dateRange?: { start: Date; end: Date };
}

export class UnifiedSearch {
  /**
   * Search across all sources
   */
  async search(
    query: string,
    userId: string,
    botId: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      sources = ['conversation', 'memory', 'github'],
      limit = 5,
      minRelevance = 0.5,
    } = options;

    log.info('[UnifiedSearch] Searching', {
      query,
      sources,
      userId,
    });

    const results: SearchResult[] = [];

    // Search in parallel
    const searches = [];

    if (sources.includes('conversation')) {
      searches.push(this.searchConversations(query, userId, botId, limit));
    }

    if (sources.includes('memory')) {
      searches.push(this.searchMemory(query, userId, botId, limit));
    }

    if (sources.includes('github')) {
      searches.push(this.searchGitHub(query, limit));
    }

    if (sources.includes('slack')) {
      searches.push(this.searchSlack(query, userId, limit));
    }

    if (sources.includes('drive')) {
      searches.push(this.searchDrive(query, userId, limit));
    }

    if (sources.includes('notion')) {
      searches.push(this.searchNotion(query, userId, limit));
    }

    const allResults = await Promise.all(searches);
    
    // Flatten and filter
    for (const sourceResults of allResults) {
      results.push(...sourceResults.filter(r => r.relevance >= minRelevance));
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    log.info('[UnifiedSearch] Search completed', {
      query,
      totalResults: results.length,
      sources: sources.length,
    });

    return results.slice(0, limit * sources.length);
  }

  /**
   * Search conversation history
   */
  private async searchConversations(
    query: string,
    userId: string,
    botId: string,
    limit: number
  ): Promise<SearchResult[]> {
    // Would search Supabase conversations table
    // For now, return empty
    return [];
  }

  /**
   * Search Pinecone memory
   */
  private async searchMemory(
    query: string,
    userId: string,
    botId: string,
    limit: number
  ): Promise<SearchResult[]> {
    if (!memory.isEnabled()) return [];

    try {
      const memories = await memory.search(botId, query, userId, limit);

      return memories.map(mem => ({
        id: mem.id,
        source: 'memory' as const,
        title: 'Memory',
        snippet: mem.content,
        relevance: mem.score,
        timestamp: new Date(mem.timestamp),
        metadata: mem.metadata,
      }));
    } catch (error) {
      log.error('[UnifiedSearch] Memory search failed', { error });
      return [];
    }
  }

  /**
   * Search GitHub
   */
  private async searchGitHub(query: string, limit: number): Promise<SearchResult[]> {
    // Would use GitHub API
    // For now, return mock results
    return [];
  }

  /**
   * Search Slack
   */
  private async searchSlack(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResult[]> {
    // Would use Slack API
    return [];
  }

  /**
   * Search Google Drive
   */
  private async searchDrive(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResult[]> {
    // Would use Drive API
    return [];
  }

  /**
   * Search Notion
   */
  private async searchNotion(
    query: string,
    userId: string,
    limit: number
  ): Promise<SearchResult[]> {
    // Would use Notion API
    return [];
  }

  /**
   * Format search results
   */
  formatResults(results: SearchResult[]): string {
    if (results.length === 0) {
      return '🔍 No results found.';
    }

    let output = `🔍 **Found ${results.length} results:**\n\n`;

    const bySource = this.groupBySource(results);

    for (const [source, items] of Object.entries(bySource)) {
      const emoji = this.getSourceEmoji(source);
      output += `${emoji} **${source.toUpperCase()}** (${items.length})\n\n`;

      for (const item of items.slice(0, 3)) {
        output += `**${item.title}**\n`;
        output += `${item.snippet.substring(0, 100)}...\n`;
        output += `Relevance: ${(item.relevance * 100).toFixed(0)}%`;
        
        if (item.url) {
          output += ` • [View](${item.url})`;
        }
        
        output += `\n\n`;
      }
    }

    return output;
  }

  /**
   * Group results by source
   */
  private groupBySource(results: SearchResult[]): Record<string, SearchResult[]> {
    const grouped: Record<string, SearchResult[]> = {};

    for (const result of results) {
      if (!grouped[result.source]) {
        grouped[result.source] = [];
      }
      grouped[result.source].push(result);
    }

    return grouped;
  }

  /**
   * Get emoji for source
   */
  private getSourceEmoji(source: string): string {
    const emojis: Record<string, string> = {
      conversation: '💬',
      memory: '🧠',
      github: '🐙',
      slack: '💼',
      drive: '📁',
      notion: '📝',
    };
    return emojis[source] || '📄';
  }
}

// Singleton
let searchInstance: UnifiedSearch | null = null;

export function getUnifiedSearch(): UnifiedSearch {
  if (!searchInstance) {
    searchInstance = new UnifiedSearch();
  }
  return searchInstance;
}

export const unifiedSearch = getUnifiedSearch();

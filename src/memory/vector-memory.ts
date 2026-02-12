import { pinecone } from '../vector/pinecone';
import { embeddings } from '../vector/embeddings';
import { log } from '../logger';

/**
 * Vector Memory System
 * 
 * Provides long-term memory and context for bots using Pinecone + OpenAI.
 * 
 * Features:
 * - Store conversation history (infinite memory)
 * - Semantic search (find relevant context)
 * - Smart context retrieval (recent + relevant)
 * - User-specific memories
 * - Bot-specific namespaces
 * 
 * Usage:
 *   await memory.store(botId, userId, "User likes pizza")
 *   const context = await memory.getContext(botId, userId, "What food?")
 *   // Returns: recent messages + relevant facts about food
 */

export interface Memory {
  id: string;
  content: string;
  score: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Context {
  recent: Memory[];    // Recent messages (by time)
  relevant: Memory[];  // Relevant memories (by similarity)
  summary: string;     // Combined context string
}

export class VectorMemory {
  private enabled: boolean;

  constructor() {
    this.enabled = pinecone.isEnabled() && embeddings.isEnabled();

    if (!this.enabled) {
      log.warn('[VectorMemory] Disabled (Pinecone or Embeddings not configured)');
    } else {
      log.info('[VectorMemory] Initialized successfully');
    }
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  // ============================================================================
  // CORE OPERATIONS
  // ============================================================================

  /**
   * Store a memory
   */
  async store(
    botId: string,
    userId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (!this.enabled) {
      log.warn('[VectorMemory] Store called but disabled');
      return;
    }

    try {
      // Generate embedding
      const embedding = await embeddings.embed(content);

      // Store in Pinecone
      await pinecone.storeMemory(
        botId,
        userId,
        content,
        embedding,
        metadata
      );

      log.info('[VectorMemory] Memory stored', {
        botId,
        userId,
        length: content.length,
      });
    } catch (error: any) {
      log.error('[VectorMemory] Store failed', {
        error: error.message,
        botId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Store multiple memories (batch)
   */
  async storeBatch(
    botId: string,
    userId: string,
    items: Array<{ content: string; metadata?: Record<string, any> }>
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      // Generate embeddings in batch
      const texts = items.map((item) => item.content);
      const results = await embeddings.embedBatch(texts);

      // Prepare vectors
      const vectors = results.map((result, i) => ({
        id: `${botId}-${userId}-${Date.now()}-${i}`,
        values: result.embedding,
        metadata: {
          botId,
          userId,
          content: result.text,
          timestamp: new Date().toISOString(),
          ...items[i].metadata,
        },
      }));

      // Upsert to Pinecone
      const namespace = `bot-${botId}`;
      await pinecone.upsert(vectors, namespace);

      log.info('[VectorMemory] Batch stored', {
        botId,
        userId,
        count: items.length,
      });
    } catch (error: any) {
      log.error('[VectorMemory] Batch store failed', {
        error: error.message,
        botId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Search memories by semantic similarity
   */
  async search(
    botId: string,
    query: string,
    userId?: string,
    limit: number = 5
  ): Promise<Memory[]> {
    if (!this.enabled) return [];

    try {
      // Generate query embedding
      const queryEmbedding = await embeddings.embed(query);

      // Search in Pinecone
      const results = await pinecone.searchMemories(
        botId,
        queryEmbedding,
        userId,
        limit
      );

      // Map to Memory objects
      const memories: Memory[] = results.map((result) => ({
        id: result.id,
        content: result.metadata?.content || '',
        score: result.score,
        timestamp: result.metadata?.timestamp || '',
        metadata: result.metadata,
      }));

      log.info('[VectorMemory] Search completed', {
        botId,
        userId,
        query: query.substring(0, 50),
        results: memories.length,
      });

      return memories;
    } catch (error: any) {
      log.error('[VectorMemory] Search failed', {
        error: error.message,
        botId,
        query,
      });
      return [];
    }
  }

  /**
   * Get context for user (recent + relevant)
   */
  async getContext(
    botId: string,
    userId: string,
    query: string,
    recentCount: number = 3,
    relevantCount: number = 5
  ): Promise<Context> {
    if (!this.enabled) {
      return {
        recent: [],
        relevant: [],
        summary: '',
      };
    }

    try {
      // Generate query embedding
      const queryEmbedding = await embeddings.embed(query);

      // Get context from Pinecone
      const context = await pinecone.getUserContext(
        botId,
        userId,
        queryEmbedding,
        recentCount,
        relevantCount
      );

      // Map to Memory objects
      const recent: Memory[] = context.recent.map((r) => ({
        id: r.id,
        content: r.metadata?.content || '',
        score: r.score,
        timestamp: r.metadata?.timestamp || '',
        metadata: r.metadata,
      }));

      const relevant: Memory[] = context.relevant.map((r) => ({
        id: r.id,
        content: r.metadata?.content || '',
        score: r.score,
        timestamp: r.metadata?.timestamp || '',
        metadata: r.metadata,
      }));

      // Generate summary
      const summary = this.generateSummary(recent, relevant);

      log.info('[VectorMemory] Context retrieved', {
        botId,
        userId,
        recent: recent.length,
        relevant: relevant.length,
      });

      return { recent, relevant, summary };
    } catch (error: any) {
      log.error('[VectorMemory] Get context failed', {
        error: error.message,
        botId,
        userId,
      });

      return {
        recent: [],
        relevant: [],
        summary: '',
      };
    }
  }

  /**
   * Delete user memories
   */
  async deleteUserMemories(botId: string, userId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await pinecone.deleteUserMemories(botId, userId);

      log.info('[VectorMemory] User memories deleted', {
        botId,
        userId,
      });
    } catch (error: any) {
      log.error('[VectorMemory] Delete failed', {
        error: error.message,
        botId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Clear all memories for bot
   */
  async clearBot(botId: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const namespace = `bot-${botId}`;
      await pinecone.deleteAll(namespace);

      log.info('[VectorMemory] Bot memories cleared', { botId });
    } catch (error: any) {
      log.error('[VectorMemory] Clear failed', {
        error: error.message,
        botId,
      });
      throw error;
    }
  }

  // ============================================================================
  // HIGH-LEVEL HELPERS
  // ============================================================================

  /**
   * Store conversation message
   */
  async storeMessage(
    botId: string,
    userId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    await this.store(botId, userId, content, {
      role,
      type: 'message',
    });
  }

  /**
   * Store user fact/preference
   */
  async storeFact(
    botId: string,
    userId: string,
    fact: string,
    category?: string
  ): Promise<void> {
    await this.store(botId, userId, fact, {
      type: 'fact',
      category,
    });
  }

  /**
   * Get conversation history
   */
  async getHistory(
    botId: string,
    userId: string,
    limit: number = 10
  ): Promise<Memory[]> {
    return this.search(botId, '', userId, limit);
  }

  /**
   * Generate context summary
   */
  private generateSummary(recent: Memory[], relevant: Memory[]): string {
    const parts: string[] = [];

    if (recent.length > 0) {
      parts.push('Recent conversation:');
      recent.forEach((m) => {
        const role = m.metadata?.role || 'unknown';
        parts.push(`- ${role}: ${m.content}`);
      });
    }

    if (relevant.length > 0) {
      if (parts.length > 0) parts.push('');
      parts.push('Relevant context:');
      relevant.forEach((m) => {
        parts.push(`- ${m.content} (${(m.score * 100).toFixed(0)}% relevant)`);
      });
    }

    return parts.join('\n');
  }

  // ============================================================================
  // STATS
  // ============================================================================

  /**
   * Get memory stats for bot
   */
  async getStats(botId: string): Promise<{
    totalVectors: number;
    dimension: number;
  }> {
    if (!this.enabled) {
      return { totalVectors: 0, dimension: 0 };
    }

    try {
      const namespace = `bot-${botId}`;
      const stats = await pinecone.getStats(namespace);

      return {
        totalVectors: stats?.vectorCount || 0,
        dimension: stats?.dimension || 1536,
      };
    } catch (error: any) {
      log.error('[VectorMemory] Get stats failed', {
        error: error.message,
        botId,
      });

      return { totalVectors: 0, dimension: 0 };
    }
  }
}

// Singleton instance
let memoryInstance: VectorMemory | null = null;

export function getMemory(): VectorMemory {
  if (!memoryInstance) {
    memoryInstance = new VectorMemory();
  }
  return memoryInstance;
}

export const memory = getMemory();

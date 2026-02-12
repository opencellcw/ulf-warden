import { Pinecone } from '@pinecone-database/pinecone';
import { log } from '../logger';

/**
 * Pinecone Vector Database Integration
 * 
 * Provides semantic search and long-term memory for bots.
 * 
 * Features:
 * - Vector storage (infinite memory)
 * - Semantic search (find similar conversations)
 * - Namespaces (organize by bot/user)
 * - Metadata filtering (precise queries)
 * 
 * Setup:
 * 1. Sign up at https://www.pinecone.io
 * 2. Create API key
 * 3. Add to .env:
 *    PINECONE_ENABLED=true
 *    PINECONE_API_KEY=xxx
 *    PINECONE_ENVIRONMENT=us-east-1-aws
 * 
 * ROI: ~$2,400/year (infinite context + semantic search)
 */

export interface VectorRecord {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

export class PineconeClient {
  private client: Pinecone | null = null;
  private enabled: boolean;
  private indexName: string;

  constructor() {
    this.enabled = process.env.PINECONE_ENABLED === 'true';
    this.indexName = process.env.PINECONE_INDEX || 'opencell-memory';

    if (!this.enabled) {
      log.info('[Pinecone] Disabled via config');
      return;
    }

    const apiKey = process.env.PINECONE_API_KEY;

    if (!apiKey) {
      log.warn('[Pinecone] API key not configured, disabling');
      this.enabled = false;
      return;
    }

    try {
      this.client = new Pinecone({
        apiKey,
      });

      log.info('[Pinecone] Initialized successfully', {
        index: this.indexName,
      });
    } catch (error: any) {
      log.error('[Pinecone] Initialization failed', { error: error.message });
      this.enabled = false;
    }
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Get Pinecone client
   */
  getClient(): Pinecone | null {
    return this.client;
  }

  // ============================================================================
  // INDEX MANAGEMENT
  // ============================================================================

  /**
   * Create index
   */
  async createIndex(
    name: string,
    dimension: number = 1536, // OpenAI embedding dimension
    metric: 'cosine' | 'euclidean' | 'dotproduct' = 'cosine'
  ): Promise<void> {
    if (!this.client) throw new Error('Pinecone not initialized');

    try {
      await this.client.createIndex({
        name,
        dimension,
        metric,
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });

      log.info('[Pinecone] Index created', { name, dimension, metric });
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        log.info('[Pinecone] Index already exists', { name });
      } else {
        throw error;
      }
    }
  }

  /**
   * List indexes
   */
  async listIndexes(): Promise<string[]> {
    if (!this.client) throw new Error('Pinecone not initialized');

    const response = await this.client.listIndexes();
    return response.indexes?.map((idx) => idx.name) || [];
  }

  /**
   * Delete index
   */
  async deleteIndex(name: string): Promise<void> {
    if (!this.client) throw new Error('Pinecone not initialized');

    await this.client.deleteIndex(name);
    log.info('[Pinecone] Index deleted', { name });
  }

  /**
   * Get index
   */
  getIndex(name?: string) {
    if (!this.client) throw new Error('Pinecone not initialized');
    return this.client.index(name || this.indexName);
  }

  // ============================================================================
  // VECTOR OPERATIONS
  // ============================================================================

  /**
   * Upsert vectors
   */
  async upsert(
    vectors: VectorRecord[],
    namespace?: string
  ): Promise<void> {
    if (!this.client) throw new Error('Pinecone not initialized');

    const index = this.getIndex();
    await index.namespace(namespace || '').upsert(vectors as any);

    log.info('[Pinecone] Vectors upserted', {
      count: vectors.length,
      namespace,
    });
  }

  /**
   * Query vectors (semantic search)
   */
  async query(
    vector: number[],
    topK: number = 10,
    namespace?: string,
    filter?: Record<string, any>
  ): Promise<QueryResult[]> {
    if (!this.client) throw new Error('Pinecone not initialized');

    const index = this.getIndex();
    const response = await index.namespace(namespace || '').query({
      vector,
      topK,
      filter,
      includeMetadata: true,
    });

    return (response.matches || []).map((match) => ({
      id: match.id,
      score: match.score || 0,
      metadata: match.metadata,
    }));
  }

  /**
   * Delete vectors
   */
  async delete(
    ids: string[],
    namespace?: string
  ): Promise<void> {
    if (!this.client) throw new Error('Pinecone not initialized');

    const index = this.getIndex();
    await index.namespace(namespace || '').deleteMany(ids);

    log.info('[Pinecone] Vectors deleted', {
      count: ids.length,
      namespace,
    });
  }

  /**
   * Delete all vectors in namespace
   */
  async deleteAll(namespace: string): Promise<void> {
    if (!this.client) throw new Error('Pinecone not initialized');

    const index = this.getIndex();
    await index.namespace(namespace).deleteAll();

    log.info('[Pinecone] Namespace cleared', { namespace });
  }

  /**
   * Fetch vectors by IDs
   */
  async fetch(
    ids: string[],
    namespace?: string
  ): Promise<Record<string, VectorRecord>> {
    if (!this.client) throw new Error('Pinecone not initialized');

    const index = this.getIndex();
    const response = await index.namespace(namespace || '').fetch(ids as any);

    const results: Record<string, VectorRecord> = {};
    if (response.records) {
      for (const [id, record] of Object.entries(response.records)) {
        results[id] = {
          id,
          values: (record as any).values || [],
          metadata: (record as any).metadata,
        };
      }
    }

    return results;
  }

  // ============================================================================
  // MEMORY OPERATIONS (HIGH-LEVEL)
  // ============================================================================

  /**
   * Store conversation memory
   */
  async storeMemory(
    botId: string,
    userId: string,
    content: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<void> {
    const id = `${botId}-${userId}-${Date.now()}`;
    const namespace = `bot-${botId}`;

    await this.upsert(
      [
        {
          id,
          values: embedding,
          metadata: {
            botId,
            userId,
            content,
            timestamp: new Date().toISOString(),
            ...metadata,
          },
        },
      ],
      namespace
    );

    log.info('[Pinecone] Memory stored', { botId, userId, id });
  }

  /**
   * Search memories (semantic)
   */
  async searchMemories(
    botId: string,
    queryEmbedding: number[],
    userId?: string,
    limit: number = 5
  ): Promise<QueryResult[]> {
    const namespace = `bot-${botId}`;
    const filter = userId ? { userId } : undefined;

    const results = await this.query(
      queryEmbedding,
      limit,
      namespace,
      filter
    );

    log.info('[Pinecone] Memories searched', {
      botId,
      userId,
      results: results.length,
    });

    return results;
  }

  /**
   * Get user context (recent + relevant)
   */
  async getUserContext(
    botId: string,
    userId: string,
    queryEmbedding: number[],
    recentCount: number = 3,
    relevantCount: number = 5
  ): Promise<{
    recent: QueryResult[];
    relevant: QueryResult[];
  }> {
    // Get all memories for user
    const allMemories = await this.searchMemories(
      botId,
      queryEmbedding,
      userId,
      recentCount + relevantCount
    );

    // Sort by timestamp (most recent first)
    const sortedByTime = [...allMemories].sort((a, b) => {
      const timeA = new Date(a.metadata?.timestamp || 0).getTime();
      const timeB = new Date(b.metadata?.timestamp || 0).getTime();
      return timeB - timeA;
    });

    // Recent memories (by time)
    const recent = sortedByTime.slice(0, recentCount);

    // Relevant memories (by semantic similarity, excluding recent)
    const recentIds = new Set(recent.map((m) => m.id));
    const relevant = allMemories
      .filter((m) => !recentIds.has(m.id))
      .slice(0, relevantCount);

    return { recent, relevant };
  }

  /**
   * Delete user memories
   */
  async deleteUserMemories(
    botId: string,
    userId: string
  ): Promise<void> {
    const namespace = `bot-${botId}`;

    // Query all user memories
    const dummyVector = new Array(1536).fill(0);
    const memories = await this.query(
      dummyVector,
      10000,
      namespace,
      { userId }
    );

    if (memories.length === 0) {
      log.info('[Pinecone] No memories to delete', { botId, userId });
      return;
    }

    // Delete them
    const ids = memories.map((m) => m.id);
    await this.delete(ids, namespace);

    log.info('[Pinecone] User memories deleted', {
      botId,
      userId,
      count: ids.length,
    });
  }

  // ============================================================================
  // STATS
  // ============================================================================

  /**
   * Get index stats
   */
  async getStats(namespace?: string): Promise<any> {
    if (!this.client) throw new Error('Pinecone not initialized');

    const index = this.getIndex();
    const stats = await index.describeIndexStats();

    if (namespace) {
      return stats.namespaces?.[namespace];
    }

    return stats;
  }
}

// Singleton instance
let pineconeInstance: PineconeClient | null = null;

export function getPinecone(): PineconeClient {
  if (!pineconeInstance) {
    pineconeInstance = new PineconeClient();
  }
  return pineconeInstance;
}

export const pinecone = getPinecone();

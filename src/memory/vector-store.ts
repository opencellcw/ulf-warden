import { ChromaClient, Collection } from 'chromadb';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { log } from '../logger';
import { Memory, MemoryMetadata, SearchResult } from './types';
import path from 'path';

/**
 * Vector Store for semantic memory storage and retrieval
 *
 * Uses ChromaDB for vector database and OpenAI embeddings
 */
export class VectorStore {
  private client: ChromaClient;
  private collection: Collection | null = null;
  private openai: OpenAI;
  private readonly collectionName = 'ulf_memory';
  private readonly embeddingModel = 'text-embedding-3-small';

  constructor() {
    // Initialize ChromaDB client
    const dbPath = path.join(process.env.DATA_DIR || './data', 'memory_db');

    this.client = new ChromaClient({
      path: dbPath
    });

    // Initialize OpenAI for embeddings
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      log.warn('[VectorStore] OpenAI API key not found, embeddings will be disabled');
    }
    this.openai = new OpenAI({ apiKey });

    log.info('[VectorStore] Initialized', { dbPath });
  }

  async init(): Promise<void> {
    try {
      // Get or create collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: 'Ulf AI persistent memory' }
      });

      const count = await this.collection.count();
      log.info('[VectorStore] Collection ready', {
        name: this.collectionName,
        count
      });
    } catch (error: any) {
      log.error('[VectorStore] Failed to initialize', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate embedding for text using OpenAI
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text
      });

      return response.data[0].embedding;
    } catch (error: any) {
      log.error('[VectorStore] Failed to generate embedding', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Store a memory with semantic embedding
   */
  async store(content: string, metadata: MemoryMetadata): Promise<string> {
    if (!this.collection) {
      throw new Error('VectorStore not initialized');
    }

    const id = uuidv4();

    try {
      log.info('[VectorStore] Storing memory', {
        id,
        type: metadata.type,
        contentLength: content.length
      });

      // Generate embedding
      const embedding = await this.generateEmbedding(content);

      // Store in ChromaDB (convert arrays to JSON strings)
      const chromaMetadata: any = {
        ...metadata,
        id,
        createdAt: new Date().toISOString(),
        accessCount: 0
      };

      // Convert arrays to JSON strings (ChromaDB limitation)
      if (chromaMetadata.tags) {
        chromaMetadata.tags = JSON.stringify(chromaMetadata.tags);
      }
      if (chromaMetadata.relatedTo) {
        chromaMetadata.relatedTo = JSON.stringify(chromaMetadata.relatedTo);
      }

      await this.collection.add({
        ids: [id],
        embeddings: [embedding],
        documents: [content],
        metadatas: [chromaMetadata]
      });

      log.info('[VectorStore] Memory stored successfully', { id });

      return id;
    } catch (error: any) {
      log.error('[VectorStore] Failed to store memory', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Semantic search for memories
   */
  async recall(query: string, limit: number = 5, filter?: Partial<MemoryMetadata>): Promise<SearchResult[]> {
    if (!this.collection) {
      throw new Error('VectorStore not initialized');
    }

    try {
      log.info('[VectorStore] Searching memories', {
        query: query.substring(0, 50),
        limit,
        filter
      });

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Search in ChromaDB
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit,
        where: filter as any
      });

      // Transform results
      const searchResults: SearchResult[] = [];

      if (results.documents[0]) {
        for (let i = 0; i < results.documents[0].length; i++) {
          const doc = results.documents[0][i];
          const metadata = results.metadatas[0]?.[i] as any;
          const distance = results.distances?.[0]?.[i];

          if (doc && metadata) {
            // Parse JSON strings back to arrays
            const parsedMetadata = { ...metadata };
            if (typeof parsedMetadata.tags === 'string') {
              try {
                parsedMetadata.tags = JSON.parse(parsedMetadata.tags);
              } catch (e) {}
            }
            if (typeof parsedMetadata.relatedTo === 'string') {
              try {
                parsedMetadata.relatedTo = JSON.parse(parsedMetadata.relatedTo);
              } catch (e) {}
            }

            searchResults.push({
              memory: {
                id: metadata.id || results.ids[0][i],
                content: doc,
                metadata: parsedMetadata,
                createdAt: metadata.createdAt,
                lastAccessed: metadata.lastAccessed,
                accessCount: metadata.accessCount || 0
              },
              similarity: distance ? 1 - distance : 0, // Convert distance to similarity
              context: undefined
            });
          }
        }
      }

      log.info('[VectorStore] Search complete', {
        resultsFound: searchResults.length
      });

      // Update access stats
      for (const result of searchResults) {
        await this.updateAccessStats(result.memory.id);
      }

      return searchResults;
    } catch (error: any) {
      log.error('[VectorStore] Search failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get memory by ID
   */
  async get(id: string): Promise<Memory | null> {
    if (!this.collection) {
      throw new Error('VectorStore not initialized');
    }

    try {
      const results = await this.collection.get({
        ids: [id]
      });

      if (results.documents[0] && results.metadatas[0]) {
        const metadata = results.metadatas[0] as any;
        return {
          id,
          content: results.documents[0],
          metadata,
          createdAt: metadata.createdAt,
          lastAccessed: metadata.lastAccessed,
          accessCount: metadata.accessCount || 0
        };
      }

      return null;
    } catch (error: any) {
      log.error('[VectorStore] Failed to get memory', {
        id,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Update memory access statistics
   */
  private async updateAccessStats(id: string): Promise<void> {
    if (!this.collection) return;

    try {
      const memory = await this.get(id);
      if (!memory) return;

      const updatedMetadata: any = {
        ...memory.metadata,
        lastAccessed: new Date().toISOString(),
        accessCount: (memory.accessCount || 0) + 1
      };

      // Convert arrays to JSON strings
      if (updatedMetadata.tags && Array.isArray(updatedMetadata.tags)) {
        updatedMetadata.tags = JSON.stringify(updatedMetadata.tags);
      }
      if (updatedMetadata.relatedTo && Array.isArray(updatedMetadata.relatedTo)) {
        updatedMetadata.relatedTo = JSON.stringify(updatedMetadata.relatedTo);
      }

      await this.collection.update({
        ids: [id],
        metadatas: [updatedMetadata]
      });
    } catch (error: any) {
      // Silently fail, not critical
      log.debug('[VectorStore] Failed to update access stats', {
        id,
        error: error.message
      });
    }
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<void> {
    if (!this.collection) {
      throw new Error('VectorStore not initialized');
    }

    try {
      await this.collection.delete({
        ids: [id]
      });

      log.info('[VectorStore] Memory deleted', { id });
    } catch (error: any) {
      log.error('[VectorStore] Failed to delete memory', {
        id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(): Promise<{
    totalMemories: number;
    byType: Record<string, number>;
  }> {
    if (!this.collection) {
      throw new Error('VectorStore not initialized');
    }

    try {
      const count = await this.collection.count();

      // Get all memories to count by type
      const all = await this.collection.get({});

      const byType: Record<string, number> = {};
      if (all.metadatas) {
        for (const metadata of all.metadatas) {
          const type = (metadata as any)?.type || 'unknown';
          byType[type] = (byType[type] || 0) + 1;
        }
      }

      return {
        totalMemories: count,
        byType
      };
    } catch (error: any) {
      log.error('[VectorStore] Failed to get stats', {
        error: error.message
      });
      return { totalMemories: 0, byType: {} };
    }
  }
}

// Export singleton instance
let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
  }
  return vectorStoreInstance;
}

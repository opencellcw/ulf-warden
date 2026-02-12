import OpenAI from 'openai';
import { log } from '../logger';
import { redisCache as cache } from '../core/redis-cache';

/**
 * Embeddings Service using OpenAI
 * 
 * Converts text to vector embeddings for semantic search.
 * 
 * Features:
 * - OpenAI text-embedding-3-small (cheapest, fastest)
 * - Batch processing (up to 100 texts)
 * - Redis caching (avoid duplicate API calls)
 * - Retry logic
 * 
 * Cost:
 * - $0.00002 per 1k tokens (~750 words)
 * - 1M tokens = $0.02
 * - Very cheap for semantic search!
 */

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  tokens: number;
}

export class EmbeddingsService {
  private client: OpenAI | null = null;
  private enabled: boolean;
  private model: string;
  private cacheEnabled: boolean;

  constructor() {
    this.enabled = process.env.OPENAI_API_KEY ? true : false;
    this.model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    this.cacheEnabled = process.env.EMBEDDING_CACHE_ENABLED !== 'false';

    if (!this.enabled) {
      log.warn('[Embeddings] OpenAI API key not configured');
      return;
    }

    try {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      log.info('[Embeddings] Initialized successfully', {
        model: this.model,
        cache: this.cacheEnabled,
      });
    } catch (error: any) {
      log.error('[Embeddings] Initialization failed', {
        error: error.message,
      });
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
   * Generate embedding for single text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('Embeddings not initialized');
    }

    // Check cache first
    if (this.cacheEnabled) {
      const cacheKey = `embedding:${this.model}:${text}`;
      const cached = await cache.get<number[]>(cacheKey);
      if (cached && cached.length > 0) {
        log.debug('[Embeddings] Cache hit', { text: text.substring(0, 50) });
        return cached;
      }
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      const embedding = response.data[0].embedding;
      const tokens = response.usage?.total_tokens || 0;

      log.info('[Embeddings] Generated', {
        text: text.substring(0, 50),
        tokens,
        dimension: embedding.length,
      });

      // Cache result (24 hours)
      if (this.cacheEnabled) {
        const cacheKey = `embedding:${this.model}:${text}`;
        await cache.set(cacheKey, embedding, 86400);
      }

      return embedding;
    } catch (error: any) {
      log.error('[Embeddings] Generation failed', {
        error: error.message,
        text: text.substring(0, 50),
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (!this.client) {
      throw new Error('Embeddings not initialized');
    }

    // Limit to 100 per batch (OpenAI limit)
    if (texts.length > 100) {
      log.warn('[Embeddings] Batch size > 100, processing in chunks', {
        total: texts.length,
      });

      const chunks = this.chunkArray(texts, 100);
      const results: EmbeddingResult[] = [];

      for (const chunk of chunks) {
        const chunkResults = await this.embedBatch(chunk);
        results.push(...chunkResults);
      }

      return results;
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
      });

      const results: EmbeddingResult[] = texts.map((text, i) => ({
        text,
        embedding: response.data[i].embedding,
        tokens: 0, // Individual token count not available in batch
      }));

      log.info('[Embeddings] Batch generated', {
        count: texts.length,
        totalTokens: response.usage?.total_tokens || 0,
      });

      // Cache results
      if (this.cacheEnabled) {
        for (const result of results) {
          const cacheKey = `embedding:${this.model}:${result.text}`;
          await cache.set(cacheKey, result.embedding, 86400);
        }
      }

      return results;
    } catch (error: any) {
      log.error('[Embeddings] Batch generation failed', {
        error: error.message,
        count: texts.length,
      });
      throw error;
    }
  }

  /**
   * Calculate similarity between two texts
   */
  async similarity(text1: string, text2: string): Promise<number> {
    const [emb1, emb2] = await Promise.all([
      this.embed(text1),
      this.embed(text2),
    ]);

    return this.cosineSimilarity(emb1, emb2);
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Calculate cost for embedding operation
   */
  calculateCost(tokens: number): number {
    // text-embedding-3-small: $0.00002 per 1k tokens
    return (tokens / 1000) * 0.00002;
  }

  /**
   * Estimate tokens for text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}

// Singleton instance
let embeddingsInstance: EmbeddingsService | null = null;

export function getEmbeddings(): EmbeddingsService {
  if (!embeddingsInstance) {
    embeddingsInstance = new EmbeddingsService();
  }
  return embeddingsInstance;
}

export const embeddings = getEmbeddings();

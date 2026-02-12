import OpenAI from 'openai';

export class EmbeddingService {
  private openai: OpenAI;
  private model: string = 'text-embedding-3-small'; // Cheaper, faster
  private cache: Map<string, number[]> = new Map();

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required for embeddings');
    }

    this.openai = new OpenAI({ apiKey: apiKey });
    console.log('[EmbeddingService] ✅ Initialized with OpenAI API');
  }

  /**
   * Generate embedding vector for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = this.getCacheKey(text);
    if (this.cache.has(cacheKey)) {
      console.log('[EmbeddingService] 💾 Cache hit');
      return this.cache.get(cacheKey)!;
    }

    try {
      console.log(`[EmbeddingService] 🔄 Generating embedding (${text.length} chars)...`);
      
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text.substring(0, 8000), // Max 8k tokens (roughly 32k chars)
        encoding_format: 'float'
      });

      const embedding = response.data[0].embedding;
      
      // Cache the result
      this.cache.set(cacheKey, embedding);
      
      // Limit cache size
      if (this.cache.size > 100) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey !== undefined) {
          this.cache.delete(firstKey);
        }
      }

      console.log(`[EmbeddingService] ✅ Embedding generated (${embedding.length} dimensions)`);
      return embedding;
    } catch (error: any) {
      console.error('[EmbeddingService] ❌ Failed to generate embedding:', error.message);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    console.log(`[EmbeddingService] 🔄 Generating ${texts.length} embeddings in batch...`);

    try {
      // Filter out cached texts
      const uncachedTexts: string[] = [];
      const uncachedIndices: number[] = [];
      const results: number[][] = new Array(texts.length);

      texts.forEach((text, i) => {
        const cacheKey = this.getCacheKey(text);
        if (this.cache.has(cacheKey)) {
          results[i] = this.cache.get(cacheKey)!;
        } else {
          uncachedTexts.push(text.substring(0, 8000));
          uncachedIndices.push(i);
        }
      });

      if (uncachedTexts.length === 0) {
        console.log('[EmbeddingService] 💾 All embeddings found in cache');
        return results;
      }

      console.log(`[EmbeddingService] 🔄 Fetching ${uncachedTexts.length} new embeddings...`);

      const response = await this.openai.embeddings.create({
        model: this.model,
        input: uncachedTexts,
        encoding_format: 'float'
      });

      // Fill in results and update cache
      response.data.forEach((item, i) => {
        const originalIndex = uncachedIndices[i];
        const text = texts[originalIndex];
        const embedding = item.embedding;
        
        results[originalIndex] = embedding;
        this.cache.set(this.getCacheKey(text), embedding);
      });

      console.log(`[EmbeddingService] ✅ Batch embeddings generated`);
      return results;
    } catch (error: any) {
      console.error('[EmbeddingService] ❌ Failed to generate batch embeddings:', error.message);
      throw error;
    }
  }

  /**
   * Get cache key for text
   */
  private getCacheKey(text: string): string {
    // Use first 200 chars as cache key (good enough for our use case)
    return text.substring(0, 200);
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[EmbeddingService] 🗑️ Cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 100
    };
  }

  /**
   * Estimate cost for generating embeddings
   * text-embedding-3-small: $0.02 per 1M tokens
   */
  estimateCost(textCount: number, avgCharsPerText: number = 1000): number {
    // Rough estimate: 1 token ≈ 4 characters
    const tokensPerText = avgCharsPerText / 4;
    const totalTokens = textCount * tokensPerText;
    const costPerMillion = 0.02;
    const cost = (totalTokens / 1000000) * costPerMillion;
    return cost;
  }
}

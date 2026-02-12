/**
 * Replicate Model Registry
 * 
 * Self-updating database of Replicate models with:
 * - Auto-discovery of new models
 * - Parameter tracking
 * - Usage analytics
 * - Semantic search
 * - Version history
 * 
 * = Bot sempre sabe os melhores/novos models! 🚀
 */

import Database from 'better-sqlite3';
import { log } from '../logger';
import path from 'path';
import Replicate from 'replicate';
import { EmbeddingService } from '../evolution/skills/embeddings';
import { cosineSimilarity } from '../evolution/skills/similarity';

// Singleton embedding service
let embeddingService: EmbeddingService | null = null;

function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    embeddingService = new EmbeddingService();
  }
  return embeddingService;
}

export interface ReplicateModel {
  id: number;
  name: string; // owner/model-name
  owner: string;
  modelName: string;
  description: string;
  latestVersion: string;
  parameters: string; // JSON stringified
  category: string; // text-to-image, image-to-image, etc
  tags: string; // comma separated
  popularityScore: number;
  usageCount: number;
  successRate: number;
  averageRunTime: number; // seconds
  lastUsed: string | null;
  lastSynced: string;
  createdAt: string;
  updatedAt: string;
  embedding?: number[]; // 1536 dimensions
}

export interface ModelVersion {
  id: number;
  modelId: number;
  versionHash: string;
  releaseDate: string;
  parameters: string; // JSON
  isActive: boolean;
  createdAt: string;
}

export interface ModelUsage {
  id: number;
  modelId: number;
  userId: string;
  prompt: string;
  success: boolean;
  runTime: number;
  errorMessage?: string;
  timestamp: string;
}

export class ReplicateModelRegistry {
  private db: Database.Database;
  private replicate?: Replicate;

  constructor(dbPath?: string) {
    const finalPath = dbPath || path.join(
      process.env.DATA_DIR || './data',
      'replicate-models.db'
    );

    this.db = new Database(finalPath);
    this.initDatabase();

    // Initialize Replicate client if API key available
    if (process.env.REPLICATE_API_TOKEN) {
      this.replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
      });
    }

    log.info('[ReplicateRegistry] Initialized', { dbPath: finalPath });
  }

  private initDatabase(): void {
    // Models table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS replicate_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        owner TEXT NOT NULL,
        model_name TEXT NOT NULL,
        description TEXT,
        latest_version TEXT,
        parameters TEXT,
        category TEXT,
        tags TEXT,
        popularity_score REAL DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0,
        average_run_time REAL DEFAULT 0,
        last_used TEXT,
        last_synced TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        embedding TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_models_name ON replicate_models(name);
      CREATE INDEX IF NOT EXISTS idx_models_category ON replicate_models(category);
      CREATE INDEX IF NOT EXISTS idx_models_owner ON replicate_models(owner);
      CREATE INDEX IF NOT EXISTS idx_models_popularity ON replicate_models(popularity_score DESC);
    `);

    // Versions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS replicate_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_id INTEGER NOT NULL,
        version_hash TEXT NOT NULL,
        release_date TEXT,
        parameters TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        FOREIGN KEY (model_id) REFERENCES replicate_models(id),
        UNIQUE(model_id, version_hash)
      );

      CREATE INDEX IF NOT EXISTS idx_versions_model ON replicate_versions(model_id);
      CREATE INDEX IF NOT EXISTS idx_versions_active ON replicate_versions(is_active);
    `);

    // Usage table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS replicate_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        prompt TEXT,
        success INTEGER NOT NULL,
        run_time REAL,
        error_message TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (model_id) REFERENCES replicate_models(id)
      );

      CREATE INDEX IF NOT EXISTS idx_usage_model ON replicate_usage(model_id);
      CREATE INDEX IF NOT EXISTS idx_usage_user ON replicate_usage(user_id);
      CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON replicate_usage(timestamp);
    `);

    log.info('[ReplicateRegistry] Database tables initialized');
  }

  /**
   * Sync models from Replicate API
   */
  async syncModels(forceFullSync: boolean = false): Promise<{
    added: number;
    updated: number;
    errors: number;
  }> {
    if (!this.replicate) {
      throw new Error('Replicate API token not configured');
    }

    log.info('[ReplicateRegistry] Starting model sync', { forceFullSync });

    let added = 0;
    let updated = 0;
    let errors = 0;

    try {
      // Fetch popular/featured models
      // Note: Replicate API doesn't have a "list all" endpoint,
      // so we maintain a curated list + discover from usage

      const curatedModels = this.getCuratedModelList();

      for (const modelName of curatedModels) {
        try {
          await this.syncSingleModel(modelName);
          
          const existing = this.getModel(modelName);
          if (existing) {
            if (existing.lastSynced === new Date().toISOString().split('T')[0]) {
              updated++;
            } else {
              added++;
            }
          }
        } catch (error: any) {
          log.error('[ReplicateRegistry] Failed to sync model', {
            model: modelName,
            error: error.message,
          });
          errors++;
        }
      }

      log.info('[ReplicateRegistry] Sync completed', { added, updated, errors });

      return { added, updated, errors };
    } catch (error: any) {
      log.error('[ReplicateRegistry] Sync failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Sync single model from API
   */
  async syncSingleModel(modelName: string): Promise<void> {
    if (!this.replicate) {
      throw new Error('Replicate API not configured');
    }

    try {
      const [owner, name] = modelName.split('/');
      
      const model = await this.replicate.models.get(owner, name);
      
      // Generate embedding for semantic search
      const embedder = getEmbeddingService();
      const embedding = await embedder.generateEmbedding(
        `${model.name} ${model.description || ''}`
      );

      const parameters = JSON.stringify({
        // Extract from model schema if available
        // For now, store common parameters
        version: model.latest_version?.id,
      });

      const now = new Date().toISOString();
      const today = now.split('T')[0];

      // Upsert model
      const stmt = this.db.prepare(`
        INSERT INTO replicate_models (
          name, owner, model_name, description, latest_version,
          parameters, category, tags, last_synced, created_at, updated_at, embedding
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          description = excluded.description,
          latest_version = excluded.latest_version,
          parameters = excluded.parameters,
          last_synced = excluded.last_synced,
          updated_at = excluded.updated_at,
          embedding = excluded.embedding
      `);

      stmt.run(
        modelName,
        owner,
        name,
        model.description || '',
        model.latest_version?.id || '',
        parameters,
        this.inferCategory(modelName, model.description || ''),
        this.extractTags(model.description || '').join(','),
        today,
        now,
        now,
        JSON.stringify(embedding)
      );

      log.info('[ReplicateRegistry] Model synced', { model: modelName });
    } catch (error: any) {
      log.error('[ReplicateRegistry] Failed to sync model', {
        model: modelName,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get model by name
   */
  getModel(name: string): ReplicateModel | null {
    const stmt = this.db.prepare('SELECT * FROM replicate_models WHERE name = ?');
    const row = stmt.get(name) as any;

    if (!row) return null;

    return this.rowToModel(row);
  }

  /**
   * Search models by text (semantic search)
   */
  async searchModels(query: string, limit: number = 5): Promise<ReplicateModel[]> {
    // Generate query embedding
    const embedder = getEmbeddingService();
    const queryEmbedding = await embedder.generateEmbedding(query);

    // Get all models with embeddings
    const stmt = this.db.prepare(`
      SELECT * FROM replicate_models 
      WHERE embedding IS NOT NULL
      ORDER BY popularity_score DESC
      LIMIT 100
    `);

    const rows = stmt.all() as any[];
    
    // Calculate similarity scores
    const results = rows
      .map((row) => {
        const model = this.rowToModel(row);
        if (!model.embedding) return null;

        const similarity = cosineSimilarity(queryEmbedding, model.embedding);
        
        return { model, similarity };
      })
      .filter((r): r is { model: ReplicateModel; similarity: number } => r !== null)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((r) => r.model);

    return results;
  }

  /**
   * Get models by category
   */
  getModelsByCategory(category: string, limit: number = 10): ReplicateModel[] {
    const stmt = this.db.prepare(`
      SELECT * FROM replicate_models 
      WHERE category = ?
      ORDER BY popularity_score DESC, usage_count DESC
      LIMIT ?
    `);

    const rows = stmt.all(category, limit) as any[];
    return rows.map((row) => this.rowToModel(row));
  }

  /**
   * Get top models
   */
  getTopModels(limit: number = 10): ReplicateModel[] {
    const stmt = this.db.prepare(`
      SELECT * FROM replicate_models 
      ORDER BY popularity_score DESC, usage_count DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as any[];
    return rows.map((row) => this.rowToModel(row));
  }

  /**
   * Record model usage
   */
  recordUsage(
    modelName: string,
    userId: string,
    prompt: string,
    success: boolean,
    runTime: number,
    errorMessage?: string
  ): void {
    const model = this.getModel(modelName);
    if (!model) {
      log.warn('[ReplicateRegistry] Model not found for usage tracking', { modelName });
      return;
    }

    const now = new Date().toISOString();

    // Insert usage record
    const usageStmt = this.db.prepare(`
      INSERT INTO replicate_usage (model_id, user_id, prompt, success, run_time, error_message, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    usageStmt.run(model.id, userId, prompt, success ? 1 : 0, runTime, errorMessage || null, now);

    // Update model stats
    const updateStmt = this.db.prepare(`
      UPDATE replicate_models 
      SET 
        usage_count = usage_count + 1,
        success_rate = (
          SELECT CAST(SUM(success) AS REAL) / COUNT(*) 
          FROM replicate_usage 
          WHERE model_id = ?
        ),
        average_run_time = (
          SELECT AVG(run_time) 
          FROM replicate_usage 
          WHERE model_id = ? AND success = 1
        ),
        last_used = ?,
        popularity_score = (usage_count + 1) * success_rate * 100,
        updated_at = ?
      WHERE id = ?
    `);

    updateStmt.run(model.id, model.id, now, now, model.id);

    log.info('[ReplicateRegistry] Usage recorded', {
      model: modelName,
      success,
      runTime,
    });
  }

  /**
   * Get usage statistics
   */
  getStats(): {
    totalModels: number;
    categories: Record<string, number>;
    topModels: ReplicateModel[];
    recentlyUsed: ReplicateModel[];
  } {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM replicate_models');
    const totalModels = (totalStmt.get() as any).count;

    const categoriesStmt = this.db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM replicate_models 
      GROUP BY category
    `);
    const categoryRows = categoriesStmt.all() as any[];
    const categories: Record<string, number> = {};
    for (const row of categoryRows) {
      categories[row.category] = row.count;
    }

    const topModels = this.getTopModels(5);

    const recentStmt = this.db.prepare(`
      SELECT * FROM replicate_models 
      WHERE last_used IS NOT NULL
      ORDER BY last_used DESC
      LIMIT 5
    `);
    const recentlyUsed = (recentStmt.all() as any[]).map((row) => this.rowToModel(row));

    return {
      totalModels,
      categories,
      topModels,
      recentlyUsed,
    };
  }

  private rowToModel(row: any): ReplicateModel {
    return {
      id: row.id,
      name: row.name,
      owner: row.owner,
      modelName: row.model_name,
      description: row.description || '',
      latestVersion: row.latest_version || '',
      parameters: row.parameters || '{}',
      category: row.category || 'unknown',
      tags: row.tags || '',
      popularityScore: row.popularity_score || 0,
      usageCount: row.usage_count || 0,
      successRate: row.success_rate || 0,
      averageRunTime: row.average_run_time || 0,
      lastUsed: row.last_used,
      lastSynced: row.last_synced,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
    };
  }

  private getCuratedModelList(): string[] {
    // Popular models to track
    return [
      // Text-to-Image
      'stability-ai/sdxl',
      'black-forest-labs/flux-pro',
      'black-forest-labs/flux-schnell',
      'black-forest-labs/flux-dev',
      'playgroundai/playground-v2.5-1024px-aesthetic',
      
      // Image-to-Image
      'stability-ai/stable-diffusion-img2img',
      'tencentarc/gfpgan',
      'sczhou/codeformer',
      
      // Video
      'stability-ai/stable-video-diffusion',
      'anotherjesse/zeroscope-v2-xl',
      
      // Audio
      'meta/musicgen',
      'suno-ai/bark',
      
      // Text
      'meta/llama-2-70b-chat',
      'mistralai/mistral-7b-instruct-v0.2',
      
      // Specialized
      'jagilley/controlnet-hough',
      'salesforce/blip',
      'xinntao/realesrgan',
    ];
  }

  private inferCategory(name: string, description: string): string {
    const text = `${name} ${description}`.toLowerCase();

    if (text.includes('text-to-image') || text.includes('image generation') || 
        text.includes('stable diffusion') || text.includes('flux')) {
      return 'text-to-image';
    }
    if (text.includes('img2img') || text.includes('image-to-image')) {
      return 'image-to-image';
    }
    if (text.includes('video')) {
      return 'video';
    }
    if (text.includes('audio') || text.includes('music') || text.includes('speech')) {
      return 'audio';
    }
    if (text.includes('upscale') || text.includes('enhance') || text.includes('restore')) {
      return 'image-enhancement';
    }
    if (text.includes('llm') || text.includes('chat') || text.includes('language')) {
      return 'text';
    }
    if (text.includes('controlnet') || text.includes('inpaint')) {
      return 'image-control';
    }

    return 'other';
  }

  private extractTags(description: string): string[] {
    const tags: Set<string> = new Set();
    const text = description.toLowerCase();

    const keywords = [
      'realistic', 'anime', 'artistic', 'photorealistic',
      'fast', 'high-quality', 'open-source', 'commercial',
      'upscaling', 'restoration', 'generation', 'editing'
    ];

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        tags.add(keyword);
      }
    }

    return Array.from(tags);
  }

  /**
   * Close database
   */
  close(): void {
    this.db.close();
  }
}

// Singleton
let registryInstance: ReplicateModelRegistry | null = null;

export function getReplicateRegistry(): ReplicateModelRegistry {
  if (!registryInstance) {
    registryInstance = new ReplicateModelRegistry();
  }
  return registryInstance;
}

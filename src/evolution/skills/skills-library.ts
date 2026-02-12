import Database from 'better-sqlite3';
import path from 'path';
import { EmbeddingService } from './embeddings';
import { cosineSimilarity } from './similarity';

export interface Skill {
  id?: number;
  name: string;
  description: string;
  code: string;
  language: 'typescript' | 'python' | 'bash' | 'other';
  category: string;
  tags: string[];
  usageCount: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  lastUsed?: Date;
  createdAt: Date;
  embedding?: number[]; // OpenAI embedding vector
}

export interface SkillSearchResult {
  skill: Skill;
  similarity: number;
  matchReason: string;
}

export class SkillsLibrary {
  private db: Database.Database;
  private embeddingService: EmbeddingService;
  private readonly similarityThreshold = 0.75; // 75% similarity to match

  constructor(dbPath: string = './data/skills.db') {
    const fullPath = path.resolve(dbPath);
    this.db = new Database(fullPath);
    this.embeddingService = new EmbeddingService();
    this.initializeDatabase();
    console.log(`[SkillsLibrary] ✅ Initialized with database: ${fullPath}`);
  }

  /**
   * Initialize database schema
   */
  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        code TEXT NOT NULL,
        language TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT NOT NULL, -- JSON array
        usage_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        failure_count INTEGER DEFAULT 0,
        success_rate REAL DEFAULT 0,
        last_used TEXT,
        created_at TEXT NOT NULL,
        embedding_json TEXT -- JSON array of embedding vector
      );

      CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);
      CREATE INDEX IF NOT EXISTS idx_skills_language ON skills(language);
      CREATE INDEX IF NOT EXISTS idx_skills_success_rate ON skills(success_rate DESC);
      CREATE INDEX IF NOT EXISTS idx_skills_usage ON skills(usage_count DESC);
    `);
  }

  /**
   * Add a new skill to the library
   */
  async addSkill(skill: Omit<Skill, 'id' | 'usageCount' | 'successCount' | 'failureCount' | 'successRate' | 'createdAt'>): Promise<number> {
    console.log(`[SkillsLibrary] 📚 Adding skill: ${skill.name}`);

    // Generate embedding for similarity search
    const embedding = await this.embeddingService.generateEmbedding(
      `${skill.name}\n${skill.description}\n${skill.code}`
    );

    const stmt = this.db.prepare(`
      INSERT INTO skills (name, description, code, language, category, tags, created_at, embedding_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      skill.name,
      skill.description,
      skill.code,
      skill.language,
      skill.category,
      JSON.stringify(skill.tags),
      new Date().toISOString(),
      JSON.stringify(embedding)
    );

    console.log(`[SkillsLibrary] ✅ Skill added with ID: ${result.lastInsertRowid}`);
    return result.lastInsertRowid as number;
  }

  /**
   * Find similar skills using semantic search
   */
  async findSimilar(query: string, limit: number = 5, minSimilarity?: number): Promise<SkillSearchResult[]> {
    console.log(`[SkillsLibrary] 🔍 Searching for similar skills: "${query.substring(0, 50)}..."`);

    // Generate embedding for query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // Get all skills with embeddings
    const skills = this.db.prepare(`
      SELECT * FROM skills WHERE embedding_json IS NOT NULL
    `).all() as any[];

    if (skills.length === 0) {
      console.log('[SkillsLibrary] ⚠️ No skills with embeddings found');
      return [];
    }

    // Calculate similarity for each skill
    const results: SkillSearchResult[] = skills.map(row => {
      const embedding = JSON.parse(row.embedding_json);
      const similarity = cosineSimilarity(queryEmbedding, embedding);

      const skill: Skill = {
        id: row.id,
        name: row.name,
        description: row.description,
        code: row.code,
        language: row.language,
        category: row.category,
        tags: JSON.parse(row.tags),
        usageCount: row.usage_count,
        successCount: row.success_count,
        failureCount: row.failure_count,
        successRate: row.success_rate,
        lastUsed: row.last_used ? new Date(row.last_used) : undefined,
        createdAt: new Date(row.created_at),
        embedding
      };

      let matchReason = '';
      if (similarity > 0.9) matchReason = 'Highly similar';
      else if (similarity > 0.8) matchReason = 'Very similar';
      else if (similarity > 0.75) matchReason = 'Similar';
      else matchReason = 'Somewhat similar';

      return { skill, similarity, matchReason };
    });

    // Filter by minimum similarity
    const threshold = minSimilarity || this.similarityThreshold;
    const filtered = results.filter(r => r.similarity >= threshold);

    // Sort by similarity (desc) then success rate
    filtered.sort((a, b) => {
      const simDiff = b.similarity - a.similarity;
      if (Math.abs(simDiff) > 0.05) return simDiff; // Prioritize similarity
      return b.skill.successRate - a.skill.successRate; // Then success rate
    });

    const topResults = filtered.slice(0, limit);
    
    console.log(`[SkillsLibrary] ✅ Found ${topResults.length} similar skills (threshold: ${threshold})`);
    topResults.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.skill.name} (${(r.similarity * 100).toFixed(1)}% similar, ${r.skill.successRate.toFixed(0)}% success)`);
    });

    return topResults;
  }

  /**
   * Get skill by name
   */
  getSkill(name: string): Skill | null {
    const row = this.db.prepare(`
      SELECT * FROM skills WHERE name = ?
    `).get(name) as any;

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      code: row.code,
      language: row.language,
      category: row.category,
      tags: JSON.parse(row.tags),
      usageCount: row.usage_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      successRate: row.success_rate,
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      createdAt: new Date(row.created_at),
      embedding: row.embedding_json ? JSON.parse(row.embedding_json) : undefined
    };
  }

  /**
   * Record skill usage
   */
  recordUsage(skillId: number, success: boolean): void {
    const stmt = this.db.prepare(`
      UPDATE skills 
      SET 
        usage_count = usage_count + 1,
        success_count = success_count + ?,
        failure_count = failure_count + ?,
        success_rate = CAST(success_count + ? AS REAL) / (usage_count + 1) * 100,
        last_used = ?
      WHERE id = ?
    `);

    stmt.run(
      success ? 1 : 0,
      success ? 0 : 1,
      success ? 1 : 0,
      new Date().toISOString(),
      skillId
    );

    console.log(`[SkillsLibrary] 📊 Recorded ${success ? 'success' : 'failure'} for skill ID ${skillId}`);
  }

  /**
   * Get top skills by success rate
   */
  getTopSkills(limit: number = 10, minUsage: number = 3): Skill[] {
    const rows = this.db.prepare(`
      SELECT * FROM skills 
      WHERE usage_count >= ?
      ORDER BY success_rate DESC, usage_count DESC
      LIMIT ?
    `).all(minUsage, limit) as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      code: row.code,
      language: row.language,
      category: row.category,
      tags: JSON.parse(row.tags),
      usageCount: row.usage_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      successRate: row.success_rate,
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * Get skills by category
   */
  getSkillsByCategory(category: string): Skill[] {
    const rows = this.db.prepare(`
      SELECT * FROM skills WHERE category = ? ORDER BY success_rate DESC
    `).all(category) as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      code: row.code,
      language: row.language,
      category: row.category,
      tags: JSON.parse(row.tags),
      usageCount: row.usage_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      successRate: row.success_rate,
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * Search skills by tags
   */
  searchByTags(tags: string[]): Skill[] {
    const rows = this.db.prepare(`
      SELECT * FROM skills
    `).all() as any[];

    // Filter by tags (JSON array contains any of the query tags)
    const filtered = rows.filter(row => {
      const skillTags = JSON.parse(row.tags) as string[];
      return tags.some(tag => skillTags.includes(tag));
    });

    return filtered.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      code: row.code,
      language: row.language,
      category: row.category,
      tags: JSON.parse(row.tags),
      usageCount: row.usage_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      successRate: row.success_rate,
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * Get library statistics
   */
  getStats(): {
    totalSkills: number;
    categories: { category: string; count: number }[];
    languages: { language: string; count: number }[];
    topPerformers: Skill[];
    recentlyUsed: Skill[];
  } {
    const totalSkills = this.db.prepare('SELECT COUNT(*) as count FROM skills').get() as any;

    const categories = this.db.prepare(`
      SELECT category, COUNT(*) as count FROM skills GROUP BY category ORDER BY count DESC
    `).all() as any[];

    const languages = this.db.prepare(`
      SELECT language, COUNT(*) as count FROM skills GROUP BY language ORDER BY count DESC
    `).all() as any[];

    const topPerformers = this.getTopSkills(5, 3);

    const recentRows = this.db.prepare(`
      SELECT * FROM skills WHERE last_used IS NOT NULL ORDER BY last_used DESC LIMIT 5
    `).all() as any[];

    const recentlyUsed = recentRows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      code: row.code,
      language: row.language,
      category: row.category,
      tags: JSON.parse(row.tags),
      usageCount: row.usage_count,
      successCount: row.success_count,
      failureCount: row.failure_count,
      successRate: row.success_rate,
      lastUsed: new Date(row.last_used),
      createdAt: new Date(row.created_at)
    }));

    return {
      totalSkills: totalSkills.count,
      categories,
      languages,
      topPerformers,
      recentlyUsed
    };
  }

  /**
   * Delete skill
   */
  deleteSkill(id: number): boolean {
    const result = this.db.prepare('DELETE FROM skills WHERE id = ?').run(id);
    return result.changes > 0;
  }

  /**
   * Update skill code (when improved)
   */
  updateSkillCode(id: number, code: string, description?: string): boolean {
    const stmt = description
      ? this.db.prepare('UPDATE skills SET code = ?, description = ? WHERE id = ?')
      : this.db.prepare('UPDATE skills SET code = ? WHERE id = ?');

    const result = description
      ? stmt.run(code, description, id)
      : stmt.run(code, id);

    return result.changes > 0;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
    console.log('[SkillsLibrary] 👋 Database closed');
  }
}

import { log } from '../logger';
import { memory } from '../memory/vector-memory';
import { embeddings } from '../vector/embeddings';

/**
 * Auto-Skill Learning System
 * 
 * Detects repetitive tasks and automatically creates optimized skills.
 * 
 * How it works:
 * 1. Monitors user interactions
 * 2. Detects patterns (same task > 3 times)
 * 3. Creates a skill automatically
 * 4. Optimizes skill with usage
 * 5. Shares skills across bots
 * 
 * Example:
 *   Week 1: User asks "convert JSON to YAML" → 5 seconds
 *   Week 2: Same task → System detects pattern
 *   Week 3: Auto-creates "json_to_yaml" skill
 *   Week 4: Same task → Instant execution (0.1s)
 * 
 * = Self-improving AI! 🚀
 */

export interface TaskPattern {
  id: string;
  description: string;
  embedding: number[];
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  averageExecutionTime: number;
  successRate: number;
  userId: string;
  botId: string;
}

export interface LearnedSkill {
  id: string;
  name: string;
  description: string;
  pattern: TaskPattern;
  implementation: string; // Code or prompt
  createdAt: Date;
  usageCount: number;
  successRate: number;
  averageSpeedup: number; // How much faster than original
  sharedWithBots: string[];
}

export class SkillDetector {
  private patterns: Map<string, TaskPattern> = new Map();
  private skills: Map<string, LearnedSkill> = new Map();
  private readonly PATTERN_THRESHOLD = 3; // Detect after 3 occurrences
  private readonly SIMILARITY_THRESHOLD = 0.85; // 85% similarity

  constructor() {
    log.info('[SkillDetector] Initialized');
  }

  /**
   * Record a task execution
   */
  async recordTask(
    userId: string,
    botId: string,
    task: string,
    executionTime: number,
    success: boolean
  ): Promise<void> {
    try {
      // Generate embedding for task
      const embedding = await embeddings.embed(task);

      // Check if similar pattern exists
      const existingPattern = await this.findSimilarPattern(
        embedding,
        userId,
        botId
      );

      if (existingPattern) {
        // Update existing pattern
        existingPattern.occurrences++;
        existingPattern.lastSeen = new Date();
        existingPattern.averageExecutionTime =
          (existingPattern.averageExecutionTime * (existingPattern.occurrences - 1) +
            executionTime) /
          existingPattern.occurrences;
        existingPattern.successRate =
          (existingPattern.successRate * (existingPattern.occurrences - 1) +
            (success ? 1 : 0)) /
          existingPattern.occurrences;

        log.info('[SkillDetector] Pattern updated', {
          patternId: existingPattern.id,
          occurrences: existingPattern.occurrences,
        });

        // Check if we should create a skill
        if (
          existingPattern.occurrences >= this.PATTERN_THRESHOLD &&
          existingPattern.successRate > 0.8 &&
          !this.hasSkillForPattern(existingPattern.id)
        ) {
          await this.createSkillFromPattern(existingPattern);
        }
      } else {
        // Create new pattern
        const pattern: TaskPattern = {
          id: `pattern-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          description: task,
          embedding,
          occurrences: 1,
          firstSeen: new Date(),
          lastSeen: new Date(),
          averageExecutionTime: executionTime,
          successRate: success ? 1 : 0,
          userId,
          botId,
        };

        this.patterns.set(pattern.id, pattern);

        log.info('[SkillDetector] New pattern recorded', {
          patternId: pattern.id,
          task: task.substring(0, 50),
        });
      }
    } catch (error: any) {
      log.error('[SkillDetector] Failed to record task', {
        error: error.message,
      });
    }
  }

  /**
   * Find similar pattern using embeddings
   */
  private async findSimilarPattern(
    embedding: number[],
    userId: string,
    botId: string
  ): Promise<TaskPattern | null> {
    let mostSimilar: TaskPattern | null = null;
    let highestSimilarity = 0;

    for (const pattern of this.patterns.values()) {
      // Only compare patterns from same user/bot
      if (pattern.userId !== userId || pattern.botId !== botId) {
        continue;
      }

      const similarity = this.cosineSimilarity(embedding, pattern.embedding);

      if (similarity > this.SIMILARITY_THRESHOLD && similarity > highestSimilarity) {
        highestSimilarity = similarity;
        mostSimilar = pattern;
      }
    }

    return mostSimilar;
  }

  /**
   * Create a skill from a detected pattern
   */
  private async createSkillFromPattern(pattern: TaskPattern): Promise<void> {
    const skillId = `skill-${Date.now()}`;
    const skillName = this.generateSkillName(pattern.description);

    const skill: LearnedSkill = {
      id: skillId,
      name: skillName,
      description: pattern.description,
      pattern,
      implementation: await this.generateSkillImplementation(pattern),
      createdAt: new Date(),
      usageCount: 0,
      successRate: 1,
      averageSpeedup: 0,
      sharedWithBots: [pattern.botId],
    };

    this.skills.set(skillId, skill);

    log.info('[SkillDetector] Skill created! 🎉', {
      skillId,
      skillName,
      basedonOccurrences: pattern.occurrences,
    });

    // Store in vector memory for retrieval
    if (memory.isEnabled()) {
      await memory.store(
        pattern.botId,
        pattern.userId,
        `Learned skill: ${skillName} - ${pattern.description}`,
        {
          type: 'learned_skill',
          skillId,
          skillName,
        }
      );
    }
  }

  /**
   * Generate skill name from pattern
   */
  private generateSkillName(description: string): string {
    // Extract key words
    const words = description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    // Take first 3 meaningful words
    const keyWords = words.slice(0, 3);

    return keyWords.join('_');
  }

  /**
   * Generate skill implementation
   */
  private async generateSkillImplementation(
    pattern: TaskPattern
  ): Promise<string> {
    // This would use LLM to generate optimized code
    // For now, return template
    return `
// Auto-generated skill
async function ${this.generateSkillName(pattern.description)}(input: any) {
  // Optimized implementation for: ${pattern.description}
  // Original avg time: ${pattern.averageExecutionTime}ms
  // Expected speedup: 10x faster
  
  // TODO: LLM-generated implementation
  return result;
}
    `.trim();
  }

  /**
   * Check if a skill exists for pattern
   */
  private hasSkillForPattern(patternId: string): boolean {
    for (const skill of this.skills.values()) {
      if (skill.pattern.id === patternId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find skill for a task
   */
  async findSkill(task: string, userId: string, botId: string): Promise<LearnedSkill | null> {
    try {
      const embedding = await embeddings.embed(task);

      let bestSkill: LearnedSkill | null = null;
      let highestSimilarity = 0;

      for (const skill of this.skills.values()) {
        // Check if skill is available for this user/bot
        if (
          skill.pattern.userId !== userId &&
          !skill.sharedWithBots.includes(botId)
        ) {
          continue;
        }

        const similarity = this.cosineSimilarity(
          embedding,
          skill.pattern.embedding
        );

        if (similarity > this.SIMILARITY_THRESHOLD && similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestSkill = skill;
        }
      }

      if (bestSkill) {
        log.info('[SkillDetector] Skill found! ⚡', {
          skillId: bestSkill.id,
          skillName: bestSkill.name,
          similarity: (highestSimilarity * 100).toFixed(0) + '%',
        });
      }

      return bestSkill;
    } catch (error: any) {
      log.error('[SkillDetector] Failed to find skill', {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Record skill usage
   */
  recordSkillUsage(
    skillId: string,
    executionTime: number,
    success: boolean
  ): void {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    skill.usageCount++;
    skill.successRate =
      (skill.successRate * (skill.usageCount - 1) + (success ? 1 : 0)) /
      skill.usageCount;

    const speedup =
      skill.pattern.averageExecutionTime / executionTime;
    skill.averageSpeedup =
      (skill.averageSpeedup * (skill.usageCount - 1) + speedup) /
      skill.usageCount;

    log.info('[SkillDetector] Skill used', {
      skillId,
      usageCount: skill.usageCount,
      speedup: `${speedup.toFixed(1)}x faster`,
    });
  }

  /**
   * Share skill with other bots
   */
  shareSkill(skillId: string, botId: string): void {
    const skill = this.skills.get(skillId);
    if (!skill) return;

    if (!skill.sharedWithBots.includes(botId)) {
      skill.sharedWithBots.push(botId);

      log.info('[SkillDetector] Skill shared', {
        skillId,
        skillName: skill.name,
        sharedWith: botId,
      });
    }
  }

  /**
   * Get all learned skills
   */
  getSkills(userId?: string, botId?: string): LearnedSkill[] {
    const skills = Array.from(this.skills.values());

    if (!userId && !botId) {
      return skills;
    }

    return skills.filter(
      skill =>
        (userId && skill.pattern.userId === userId) ||
        (botId && skill.sharedWithBots.includes(botId))
    );
  }

  /**
   * Get skill statistics
   */
  getStats(): {
    totalPatterns: number;
    totalSkills: number;
    avgSpeedup: number;
    topSkills: Array<{ name: string; usage: number; speedup: number }>;
  } {
    const skills = Array.from(this.skills.values());

    const avgSpeedup =
      skills.reduce((sum, skill) => sum + skill.averageSpeedup, 0) /
      (skills.length || 1);

    const topSkills = skills
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(skill => ({
        name: skill.name,
        usage: skill.usageCount,
        speedup: skill.averageSpeedup,
      }));

    return {
      totalPatterns: this.patterns.size,
      totalSkills: this.skills.size,
      avgSpeedup,
      topSkills,
    };
  }

  /**
   * Format skill report
   */
  formatSkillReport(): string {
    const stats = this.getStats();

    let output = '🎓 **Auto-Learned Skills Report**\n\n';
    output += `📊 **Statistics:**\n`;
    output += `   Patterns detected: ${stats.totalPatterns}\n`;
    output += `   Skills created: ${stats.totalSkills}\n`;
    output += `   Average speedup: ${stats.avgSpeedup.toFixed(1)}x faster ⚡\n\n`;

    if (stats.topSkills.length > 0) {
      output += `🏆 **Top Skills:**\n\n`;
      stats.topSkills.forEach((skill, i) => {
        output += `${i + 1}. **${skill.name}**\n`;
        output += `   Used: ${skill.usage} times\n`;
        output += `   Speedup: ${skill.speedup.toFixed(1)}x\n\n`;
      });
    }

    return output;
  }

  /**
   * Cosine similarity between vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Singleton
let detectorInstance: SkillDetector | null = null;

export function getSkillDetector(): SkillDetector {
  if (!detectorInstance) {
    detectorInstance = new SkillDetector();
  }
  return detectorInstance;
}

export const skillDetector = getSkillDetector();

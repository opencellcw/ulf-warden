import { log } from '../logger';
import { memory } from '../memory/vector-memory';
import { embeddings } from '../vector/embeddings';

/**
 * Copy My Style System
 * 
 * Bot learns YOUR unique style from:
 * - Writing patterns
 * - Code style
 * - Decision making
 * - Communication preferences
 * 
 * Then writes EXACTLY like you!
 * 
 * Example:
 *   Analyze: 100+ emails, Slack messages, code commits
 *   Learn: Your vocabulary, tone, structure, humor
 *   Result: Bot writes emails that sound EXACTLY like you
 * 
 * = Personal AI twin! 🤯
 */

export interface StyleProfile {
  userId: string;
  botId: string;
  writingStyle: {
    vocabulary: string[]; // Common words
    toneMarkers: string[]; // "lol", "haha", "btw", etc
    sentenceStructure: 'short' | 'medium' | 'long';
    formalityLevel: number; // 0-1 (casual to formal)
    emojiUsage: number; // 0-1 (never to always)
    punctuationStyle: string; // "...", "!!!", etc
  };
  codeStyle: {
    indentation: 'tabs' | 'spaces' | 'mixed';
    namingConvention: 'camelCase' | 'snake_case' | 'PascalCase';
    commentFrequency: number; // 0-1
    functionLength: 'short' | 'medium' | 'long';
    preferredPatterns: string[];
  };
  decisionMaking: {
    riskTolerance: number; // 0-1 (cautious to aggressive)
    detailLevel: number; // 0-1 (high-level to detailed)
    biasTowards: string[]; // ["action", "analysis", "collaboration"]
  };
  examples: Array<{
    type: 'email' | 'message' | 'code' | 'decision';
    content: string;
    timestamp: Date;
  }>;
  lastUpdated: Date;
  sampleCount: number;
}

export class CopyStyleSystem {
  private profiles: Map<string, StyleProfile> = new Map();

  /**
   * Analyze user content to learn style
   */
  async analyzeAndLearn(
    userId: string,
    botId: string,
    content: string,
    type: 'email' | 'message' | 'code' | 'decision'
  ): Promise<void> {
    const profileKey = `${userId}-${botId}`;
    let profile = this.profiles.get(profileKey);

    if (!profile) {
      profile = this.createEmptyProfile(userId, botId);
      this.profiles.set(profileKey, profile);
    }

    // Add example
    profile.examples.push({
      type,
      content,
      timestamp: new Date(),
    });

    profile.sampleCount++;
    profile.lastUpdated = new Date();

    // Analyze style
    if (type === 'email' || type === 'message') {
      this.analyzeWritingStyle(profile, content);
    } else if (type === 'code') {
      this.analyzeCodeStyle(profile, content);
    }

    log.info('[CopyStyle] Style learned', {
      userId,
      type,
      sampleCount: profile.sampleCount,
    });

    // Store in memory for persistence
    if (memory.isEnabled() && profile.sampleCount % 10 === 0) {
      await memory.store(
        botId,
        userId,
        `Style profile updated: ${profile.sampleCount} samples`,
        {
          type: 'style_profile',
          sampleCount: profile.sampleCount,
        }
      );
    }
  }

  /**
   * Generate content in user's style
   */
  generateInStyle(
    userId: string,
    botId: string,
    prompt: string,
    type: 'email' | 'message' | 'code'
  ): string {
    const profileKey = `${userId}-${botId}`;
    const profile = this.profiles.get(profileKey);

    if (!profile || profile.sampleCount < 5) {
      return prompt; // Not enough samples yet
    }

    // Generate style instructions for LLM
    const styleInstructions = this.generateStyleInstructions(profile, type);

    return `${styleInstructions}\n\n${prompt}`;
  }

  /**
   * Generate style instructions for LLM
   */
  private generateStyleInstructions(
    profile: StyleProfile,
    type: string
  ): string {
    let instructions = `Write in this user's exact style:\n\n`;

    if (type === 'email' || type === 'message') {
      const ws = profile.writingStyle;
      
      instructions += `**Tone:** ${ws.formalityLevel > 0.7 ? 'Formal' : ws.formalityLevel > 0.4 ? 'Professional' : 'Casual'}\n`;
      instructions += `**Sentences:** ${ws.sentenceStructure} length\n`;
      instructions += `**Emojis:** ${ws.emojiUsage > 0.5 ? 'Use frequently' : ws.emojiUsage > 0.2 ? 'Use occasionally' : 'Rarely use'}\n`;
      
      if (ws.toneMarkers.length > 0) {
        instructions += `**Common phrases:** ${ws.toneMarkers.slice(0, 5).join(', ')}\n`;
      }
      
      if (ws.vocabulary.length > 0) {
        instructions += `**Vocabulary:** Use words like: ${ws.vocabulary.slice(0, 10).join(', ')}\n`;
      }
    } else if (type === 'code') {
      const cs = profile.codeStyle;
      
      instructions += `**Code Style:**\n`;
      instructions += `- Indentation: ${cs.indentation}\n`;
      instructions += `- Naming: ${cs.namingConvention}\n`;
      instructions += `- Comments: ${cs.commentFrequency > 0.5 ? 'Detailed' : 'Minimal'}\n`;
      instructions += `- Functions: ${cs.functionLength} length\n`;
    }

    return instructions;
  }

  /**
   * Analyze writing style
   */
  private analyzeWritingStyle(profile: StyleProfile, content: string): void {
    const words = content.toLowerCase().split(/\s+/);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());

    // Update vocabulary
    const newWords = words.filter(w => w.length > 3 && /^[a-z]+$/.test(w));
    profile.writingStyle.vocabulary.push(...newWords);
    profile.writingStyle.vocabulary = Array.from(new Set(profile.writingStyle.vocabulary))
      .slice(-100); // Keep last 100 unique words

    // Detect tone markers
    const markers = ['lol', 'haha', 'btw', 'fyi', 'imho', 'tbh', 'imo'];
    for (const marker of markers) {
      if (content.toLowerCase().includes(marker)) {
        if (!profile.writingStyle.toneMarkers.includes(marker)) {
          profile.writingStyle.toneMarkers.push(marker);
        }
      }
    }

    // Sentence length
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    profile.writingStyle.sentenceStructure =
      avgSentenceLength < 8 ? 'short' :
      avgSentenceLength < 15 ? 'medium' : 'long';

    // Formality (presence of formal words)
    const formalWords = ['regards', 'sincerely', 'furthermore', 'consequently', 'therefore'];
    const formalCount = formalWords.filter(w => content.toLowerCase().includes(w)).length;
    profile.writingStyle.formalityLevel = Math.min(formalCount / 3, 1);

    // Emoji usage
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]/gu) || []).length;
    profile.writingStyle.emojiUsage = Math.min(emojiCount / (content.length / 100), 1);
  }

  /**
   * Analyze code style
   */
  private analyzeCodeStyle(profile: StyleProfile, content: string): void {
    // Detect indentation
    if (content.includes('\t')) {
      profile.codeStyle.indentation = 'tabs';
    } else if (content.match(/^ {2}/m)) {
      profile.codeStyle.indentation = 'spaces';
    }

    // Detect naming convention
    if (content.match(/[a-z][A-Z]/)) {
      profile.codeStyle.namingConvention = 'camelCase';
    } else if (content.match(/[a-z]_[a-z]/)) {
      profile.codeStyle.namingConvention = 'snake_case';
    } else if (content.match(/[A-Z][a-z][A-Z]/)) {
      profile.codeStyle.namingConvention = 'PascalCase';
    }

    // Comment frequency
    const lines = content.split('\n');
    const commentLines = lines.filter(l => l.trim().startsWith('//') || l.includes('/*'));
    profile.codeStyle.commentFrequency = commentLines.length / lines.length;
  }

  /**
   * Create empty profile
   */
  private createEmptyProfile(userId: string, botId: string): StyleProfile {
    return {
      userId,
      botId,
      writingStyle: {
        vocabulary: [],
        toneMarkers: [],
        sentenceStructure: 'medium',
        formalityLevel: 0.5,
        emojiUsage: 0,
        punctuationStyle: '',
      },
      codeStyle: {
        indentation: 'spaces',
        namingConvention: 'camelCase',
        commentFrequency: 0,
        functionLength: 'medium',
        preferredPatterns: [],
      },
      decisionMaking: {
        riskTolerance: 0.5,
        detailLevel: 0.5,
        biasTowards: [],
      },
      examples: [],
      lastUpdated: new Date(),
      sampleCount: 0,
    };
  }

  /**
   * Get profile readiness
   */
  getReadiness(userId: string, botId: string): {
    ready: boolean;
    sampleCount: number;
    recommendation: string;
  } {
    const profileKey = `${userId}-${botId}`;
    const profile = this.profiles.get(profileKey);

    if (!profile) {
      return {
        ready: false,
        sampleCount: 0,
        recommendation: 'Start by sharing some of your writing with me!',
      };
    }

    if (profile.sampleCount < 5) {
      return {
        ready: false,
        sampleCount: profile.sampleCount,
        recommendation: `I need ${5 - profile.sampleCount} more samples to learn your style.`,
      };
    }

    return {
      ready: true,
      sampleCount: profile.sampleCount,
      recommendation: `I've learned your style from ${profile.sampleCount} samples! Ready to write like you.`,
    };
  }
}

// Singleton
let copyStyleInstance: CopyStyleSystem | null = null;

export function getCopyStyle(): CopyStyleSystem {
  if (!copyStyleInstance) {
    copyStyleInstance = new CopyStyleSystem();
  }
  return copyStyleInstance;
}

export const copyStyle = getCopyStyle();

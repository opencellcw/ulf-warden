import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { log } from '../logger';
import { dailyLogger } from './daily-logger';

/**
 * Memory Curator
 *
 * Analyzes daily logs and curates MEMORY.md with important insights.
 * Runs periodically to extract learnings, patterns, and important facts.
 */

export interface CurationResult {
  insights: string[];
  facts: string[];
  patterns: string[];
  obsolete: string[];
}

export class MemoryCurator {
  private workspacePath: string;
  private memoryFilePath: string;
  private client: Anthropic | null = null;
  private lastCuration: Date | null = null;
  private curationInterval: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor(workspacePath: string = './workspace') {
    this.workspacePath = workspacePath;
    this.memoryFilePath = path.join(workspacePath, 'MEMORY.md');

    // Initialize Anthropic client if API key available
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  /**
   * Analyze daily logs and extract insights
   */
  async analyzeLogs(days: number = 7): Promise<CurationResult> {
    try {
      const recentLogs = await dailyLogger.getRecentLogs(days);

      if (recentLogs.length === 0) {
        log.info('[MemoryCurator] No recent logs to analyze');
        return { insights: [], facts: [], patterns: [], obsolete: [] };
      }

      // Combine logs
      const combinedLogs = recentLogs
        .map(({ date, content }) => `## ${date}\n${content}`)
        .join('\n\n---\n\n');

      // Use Claude to analyze if available
      if (this.client) {
        return await this.analyzeWithClaude(combinedLogs);
      } else {
        // Fallback: simple extraction
        return this.simpleAnalysis(combinedLogs);
      }
    } catch (error: any) {
      log.error('[MemoryCurator] Failed to analyze logs', { error: error.message });
      return { insights: [], facts: [], patterns: [], obsolete: [] };
    }
  }

  /**
   * Use Claude to analyze logs (smart analysis)
   */
  private async analyzeWithClaude(logs: string): Promise<CurationResult> {
    try {
      const prompt = `Analyze these daily logs and extract:

1. **Insights** - Important learnings, lessons, or discoveries
2. **Facts** - Key information that should be remembered long-term
3. **Patterns** - Recurring themes, behaviors, or issues
4. **Obsolete** - Information that might be outdated or no longer relevant

Daily Logs:
${logs}

Return as JSON:
{
  "insights": ["insight 1", "insight 2"],
  "facts": ["fact 1", "fact 2"],
  "patterns": ["pattern 1", "pattern 2"],
  "obsolete": ["obsolete 1"]
}`;

      const response = await this.client!.messages.create({
        model: 'claude-haiku-4-20250514', // Fast and cheap
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });

      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        return this.simpleAnalysis(logs);
      }

      // Extract JSON from response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        log.info('[MemoryCurator] Claude analysis complete', {
          insights: result.insights?.length || 0,
          facts: result.facts?.length || 0,
          patterns: result.patterns?.length || 0
        });
        return result;
      }

      return this.simpleAnalysis(logs);
    } catch (error: any) {
      log.error('[MemoryCurator] Claude analysis failed', { error: error.message });
      return this.simpleAnalysis(logs);
    }
  }

  /**
   * Simple analysis fallback (keyword-based)
   */
  private simpleAnalysis(logs: string): CurationResult {
    const insights: string[] = [];
    const facts: string[] = [];
    const patterns: string[] = [];

    // Extract learnings
    const learningMatches = logs.match(/💡 \*\*Learning:\*\* (.+)/g);
    if (learningMatches) {
      insights.push(...learningMatches.map(m => m.replace(/💡 \*\*Learning:\*\* /, '')));
    }

    // Extract decisions
    const decisionMatches = logs.match(/📋 \*\*Decision:\*\* (.+)/g);
    if (decisionMatches) {
      facts.push(...decisionMatches.map(m => m.replace(/📋 \*\*Decision:\*\* /, '')));
    }

    // Extract errors (patterns)
    const errorMatches = logs.match(/🔴 \*\*Error:\*\* (.+)/g);
    if (errorMatches && errorMatches.length > 2) {
      patterns.push(`Errors encountered: ${errorMatches.length} times`);
    }

    return { insights, facts, patterns, obsolete: [] };
  }

  /**
   * Update MEMORY.md with curated insights
   */
  async curateMemory(dryRun: boolean = false): Promise<void> {
    try {
      log.info('[MemoryCurator] Starting memory curation', { dryRun });

      // Analyze recent logs
      const analysis = await this.analyzeLogs(7);

      if (analysis.insights.length === 0 && analysis.facts.length === 0) {
        log.info('[MemoryCurator] No new insights to curate');
        return;
      }

      // Read current MEMORY.md
      let memoryContent = '';
      if (fs.existsSync(this.memoryFilePath)) {
        memoryContent = fs.readFileSync(this.memoryFilePath, 'utf-8');
      }

      // Build updates
      const updates: string[] = [];

      // Add insights to "Lições Aprendidas"
      if (analysis.insights.length > 0) {
        const date = new Date().toISOString().split('T')[0];
        updates.push(`\n### ${date}: Insights Recentes`);
        analysis.insights.forEach(insight => {
          updates.push(`- ${insight}`);
        });
      }

      // Add facts to "Fatos Importantes"
      if (analysis.facts.length > 0) {
        updates.push('\n### Fatos Novos');
        analysis.facts.forEach(fact => {
          updates.push(`- ${fact}`);
        });
      }

      // Add patterns to "Lições Aprendidas"
      if (analysis.patterns.length > 0) {
        updates.push('\n### Padrões Observados');
        analysis.patterns.forEach(pattern => {
          updates.push(`- ${pattern}`);
        });
      }

      const updateText = updates.join('\n');

      if (dryRun) {
        log.info('[MemoryCurator] Dry run - proposed updates:', { updates: updateText });
        return;
      }

      // Append updates to MEMORY.md
      // Find "## Lições Aprendidas" section and insert after it
      if (memoryContent.includes('## Lições Aprendidas')) {
        const sectionIndex = memoryContent.indexOf('## Lições Aprendidas');
        const afterSection = memoryContent.substring(sectionIndex);
        const nextSectionMatch = afterSection.match(/\n## [A-Z]/);
        const insertPosition = nextSectionMatch
          ? sectionIndex + nextSectionMatch.index!
          : memoryContent.length;

        memoryContent =
          memoryContent.substring(0, insertPosition) +
          updateText +
          '\n' +
          memoryContent.substring(insertPosition);
      } else {
        // No section found, append at end
        memoryContent += `\n\n## Lições Aprendidas\n${updateText}`;
      }

      // Write back
      fs.writeFileSync(this.memoryFilePath, memoryContent, 'utf-8');

      log.info('[MemoryCurator] Memory curated successfully', {
        insights: analysis.insights.length,
        facts: analysis.facts.length,
        patterns: analysis.patterns.length
      });

      this.lastCuration = new Date();
    } catch (error: any) {
      log.error('[MemoryCurator] Failed to curate memory', { error: error.message });
    }
  }

  /**
   * Start automatic curation (runs periodically)
   */
  startAutoCuration(intervalMs?: number): void {
    if (intervalMs) {
      this.curationInterval = intervalMs;
    }

    log.info('[MemoryCurator] Starting auto-curation', {
      interval: `${this.curationInterval / 1000 / 60 / 60}h`
    });

    setInterval(async () => {
      log.info('[MemoryCurator] Running scheduled curation');
      await this.curateMemory(false);
    }, this.curationInterval);
  }

  /**
   * Get curation status
   */
  getStatus(): { lastCuration: Date | null; intervalHours: number } {
    return {
      lastCuration: this.lastCuration,
      intervalHours: this.curationInterval / 1000 / 60 / 60
    };
  }
}

// Export singleton
export const memoryCurator = new MemoryCurator();

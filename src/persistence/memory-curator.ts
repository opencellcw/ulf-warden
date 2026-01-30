import Anthropic from '@anthropic-ai/sdk';
import { persistence } from './index';
import fs from 'fs';
import path from 'path';

const CURATION_INTERVAL = 10; // Curate every 10 conversations

export class MemoryCurator {
  private static instance: MemoryCurator;
  private anthropic: Anthropic;
  private conversationCount: number = 0;

  private constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    });
  }

  static getInstance(): MemoryCurator {
    if (!MemoryCurator.instance) {
      MemoryCurator.instance = new MemoryCurator();
    }
    return MemoryCurator.instance;
  }

  incrementConversationCount(): void {
    this.conversationCount++;
    if (this.conversationCount >= CURATION_INTERVAL) {
      this.conversationCount = 0;
      // Run curation in background, don't wait
      this.curateMemories().catch(err => {
        console.error('[MemoryCurator] Curation failed:', err);
      });
    }
  }

  async curateMemories(): Promise<void> {
    try {
      console.log('[MemoryCurator] Starting memory curation...');

      // Get recent daily logs
      const logs = await this.getRecentLogs(7); // Last 7 days

      if (!logs || logs.length === 0) {
        console.log('[MemoryCurator] No logs to curate');
        return;
      }

      // Get current memory
      const currentMemory = await persistence.getMemory();

      // Build curation prompt
      const curationPrompt = `You are Ulfberht-Warden's memory curator. Analyze these daily logs and extract important insights to remember.

Current Memory:
${currentMemory || '(empty)'}

---

Recent Daily Logs:
${logs.join('\n\n---\n\n')}

---

Extract and summarize:
1. User preferences (tech stack, coding style, preferences)
2. Completed projects and tasks
3. Recurring patterns or workflows
4. Important facts to remember about users
5. Skills or knowledge gained

Format the output as markdown that can be appended to MEMORY.md.
Be concise but comprehensive. Focus on actionable insights.`;

      // Call Claude to curate
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: curationPrompt
          }
        ]
      });

      const curatedContent = response.content
        .filter(c => c.type === 'text')
        .map(c => 'text' in c ? c.text : '')
        .join('\n');

      if (curatedContent.trim()) {
        // Update memory
        await persistence.updateMemory(`\n\n## Curated on ${new Date().toISOString().split('T')[0]}\n\n${curatedContent}`);
        console.log('[MemoryCurator] ✓ Memory updated with curated insights');
      }

    } catch (error) {
      console.error('[MemoryCurator] Curation failed:', error);
    }
  }

  private async getRecentLogs(days: number): Promise<string[]> {
    const logs: string[] = [];
    const memoryDir = path.join('./workspace/memory');

    if (!fs.existsSync(memoryDir)) {
      return logs;
    }

    // Get dates for last N days
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Read log files
    for (const date of dates) {
      const logPath = path.join(memoryDir, `${date}.md`);
      if (fs.existsSync(logPath)) {
        try {
          const content = fs.readFileSync(logPath, 'utf-8');
          logs.push(`# ${date}\n${content}`);
        } catch (error) {
          console.error(`[MemoryCurator] Failed to read log for ${date}:`, error);
        }
      }
    }

    return logs;
  }

  // Manually trigger curation (useful for testing)
  async triggerCuration(): Promise<void> {
    await this.curateMemories();
  }
}

// Export singleton instance
export const memoryCurator = MemoryCurator.getInstance();

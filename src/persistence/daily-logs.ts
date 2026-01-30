import { persistence } from './index';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages';

export class DailyLogManager {
  private static instance: DailyLogManager;
  private currentDate: string = '';

  private constructor() {
    this.updateCurrentDate();
    // Update date at midnight
    setInterval(() => this.updateCurrentDate(), 60000); // Check every minute
  }

  static getInstance(): DailyLogManager {
    if (!DailyLogManager.instance) {
      DailyLogManager.instance = new DailyLogManager();
    }
    return DailyLogManager.instance;
  }

  private updateCurrentDate(): void {
    const newDate = new Date().toISOString().split('T')[0];
    if (newDate !== this.currentDate) {
      this.currentDate = newDate;
      console.log(`[DailyLog] Date changed to ${this.currentDate}`);
    }
  }

  private getCurrentDate(): string {
    return this.currentDate;
  }

  async logConversation(userId: string, message: MessageParam): Promise<void> {
    try {
      const date = this.getCurrentDate();
      const role = typeof message === 'object' && 'role' in message ? message.role : 'unknown';

      let content = '';
      if (typeof message === 'object' && 'content' in message) {
        if (typeof message.content === 'string') {
          content = message.content;
        } else if (Array.isArray(message.content)) {
          content = message.content
            .map(c => {
              if (typeof c === 'object' && 'text' in c) return c.text;
              if (typeof c === 'object' && 'type' in c) return `[${c.type}]`;
              return '';
            })
            .join(' ');
        }
      }

      // Truncate very long messages
      if (content.length > 500) {
        content = content.substring(0, 500) + '...';
      }

      const logEntry = `## Conversation\n- User: ${userId}\n- Role: ${role}\n- Preview: ${content.split('\n')[0]}\n- Time: ${new Date().toISOString()}`;

      await persistence.saveDailyLog(date, logEntry);
    } catch (error) {
      console.error('[DailyLog] Failed to log conversation:', error);
    }
  }

  async logToolExecution(userId: string, toolName: string, input: any, output: any, status: string): Promise<void> {
    try {
      const date = this.getCurrentDate();

      const inputStr = typeof input === 'object' ? JSON.stringify(input) : String(input);
      const outputStr = output ? (typeof output === 'object' ? JSON.stringify(output).substring(0, 200) : String(output).substring(0, 200)) : 'N/A';

      const logEntry = `## Tool Execution\n- User: ${userId}\n- Tool: ${toolName}\n- Input: ${inputStr.substring(0, 200)}\n- Output: ${outputStr}\n- Status: ${status}\n- Time: ${new Date().toISOString()}`;

      await persistence.saveDailyLog(date, logEntry);
    } catch (error) {
      console.error('[DailyLog] Failed to log tool execution:', error);
    }
  }

  async logLearning(userId: string, learning: string): Promise<void> {
    try {
      const date = this.getCurrentDate();

      const logEntry = `## Learning\n- User: ${userId}\n- Content: ${learning}\n- Time: ${new Date().toISOString()}`;

      await persistence.saveDailyLog(date, logEntry);
    } catch (error) {
      console.error('[DailyLog] Failed to log learning:', error);
    }
  }

  async logError(userId: string, error: string, context?: string): Promise<void> {
    try {
      const date = this.getCurrentDate();

      const logEntry = `## Error\n- User: ${userId}\n- Error: ${error}\n- Context: ${context || 'N/A'}\n- Time: ${new Date().toISOString()}`;

      await persistence.saveDailyLog(date, logEntry);
    } catch (error) {
      console.error('[DailyLog] Failed to log error:', error);
    }
  }

  async getTodayLog(): Promise<string | null> {
    return await persistence.getDailyLog(this.getCurrentDate());
  }

  async getLogForDate(date: string): Promise<string | null> {
    return await persistence.getDailyLog(date);
  }
}

// Export singleton instance
export const dailyLog = DailyLogManager.getInstance();

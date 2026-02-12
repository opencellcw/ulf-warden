import fs from 'fs';
import { intervalManager } from '../../utils/interval-manager';
import path from 'path';
import { log } from '../logger';

/**
 * Enhanced Daily Logger
 *
 * Writes structured daily logs to workspace/memory/YYYY-MM-DD.md
 * Automatically creates and maintains daily log files.
 */

export interface LogEvent {
  type: 'conversation' | 'tool' | 'decision' | 'learning' | 'error' | 'deploy' | 'system';
  timestamp: string;
  userId?: string;
  content: string;
  metadata?: Record<string, any>;
}

export class DailyLogger {
  private workspacePath: string;
  private memoryPath: string;
  private currentDate: string = '';

  constructor(workspacePath: string = './workspace') {
    this.workspacePath = workspacePath;
    this.memoryPath = path.join(workspacePath, 'memory');
    this.updateCurrentDate();

    // Ensure memory directory exists
    this.ensureMemoryDirectory();

    // Check date every minute
    intervalManager.register('daily-logger-update', () => this.updateCurrentDate(), 60000);
  }

  private ensureMemoryDirectory(): void {
    try {
      if (!fs.existsSync(this.memoryPath)) {
        fs.mkdirSync(this.memoryPath, { recursive: true });
        log.info('[DailyLogger] Created memory directory');
      }
    } catch (error: any) {
      log.error('[DailyLogger] Failed to create memory directory', { error: error.message });
    }
  }

  private updateCurrentDate(): void {
    const newDate = new Date().toISOString().split('T')[0];
    if (newDate !== this.currentDate) {
      this.currentDate = newDate;
      log.info('[DailyLogger] Date changed', { date: this.currentDate });
      this.ensureTodayFile();
    }
  }

  private getCurrentDate(): string {
    return this.currentDate || new Date().toISOString().split('T')[0];
  }

  private getLogFilePath(date: string): string {
    return path.join(this.memoryPath, `${date}.md`);
  }

  /**
   * Ensure today's log file exists with proper structure
   */
  private ensureTodayFile(): void {
    const date = this.getCurrentDate();
    const filePath = this.getLogFilePath(date);

    if (!fs.existsSync(filePath)) {
      const template = this.createDailyTemplate(date);
      try {
        fs.writeFileSync(filePath, template, 'utf-8');
        log.info('[DailyLogger] Created daily log file', { date, path: filePath });
      } catch (error: any) {
        log.error('[DailyLogger] Failed to create daily log', { error: error.message });
      }
    }
  }

  /**
   * Create template for new daily log
   */
  private createDailyTemplate(date: string): string {
    return `# Daily Log - ${date}

## Summary
<!-- Auto-generated summary at end of day -->

## Activities

### Conversations
<!-- Key conversations and interactions -->

### Decisions
<!-- Important decisions made -->

### Tool Executions
<!-- Notable tool uses -->

### Learnings
<!-- New insights and lessons -->

### Errors & Issues
<!-- Problems encountered and resolutions -->

### System Events
<!-- Deploys, restarts, configuration changes -->

---

## Notes
<!-- Additional context or observations -->
`;
  }

  /**
   * Append event to today's log
   */
  async logEvent(event: LogEvent): Promise<void> {
    try {
      const date = this.getCurrentDate();
      const filePath = this.getLogFilePath(date);

      this.ensureTodayFile();

      const timestamp = new Date(event.timestamp).toLocaleTimeString('pt-BR');
      const section = this.getSectionForEventType(event.type);

      // Format event entry
      let entry = `\n**[${timestamp}]**`;
      if (event.userId) {
        entry += ` User: ${event.userId}`;
      }
      entry += `\n${event.content}`;

      if (event.metadata && Object.keys(event.metadata).length > 0) {
        entry += `\n_Metadata: ${JSON.stringify(event.metadata, null, 2)}_`;
      }
      entry += '\n';

      // Read current content
      let content = fs.readFileSync(filePath, 'utf-8');

      // Find section and append
      const sectionMarker = `### ${section}`;
      const sectionIndex = content.indexOf(sectionMarker);

      if (sectionIndex !== -1) {
        // Find end of section (next ### or ---)
        const afterSection = content.substring(sectionIndex + sectionMarker.length);
        const nextSectionMatch = afterSection.match(/\n###|---/);
        const insertPosition = nextSectionMatch
          ? sectionIndex + sectionMarker.length + nextSectionMatch.index!
          : content.length;

        // Insert entry
        content = content.substring(0, insertPosition) + entry + content.substring(insertPosition);
      } else {
        // Section not found, append at end
        content += `\n### ${section}\n${entry}`;
      }

      fs.writeFileSync(filePath, content, 'utf-8');
      log.debug('[DailyLogger] Event logged', { type: event.type, date });
    } catch (error: any) {
      log.error('[DailyLogger] Failed to log event', {
        type: event.type,
        error: error.message
      });
    }
  }

  /**
   * Map event type to section name
   */
  private getSectionForEventType(type: string): string {
    const map: Record<string, string> = {
      conversation: 'Conversations',
      tool: 'Tool Executions',
      decision: 'Decisions',
      learning: 'Learnings',
      error: 'Errors & Issues',
      deploy: 'System Events',
      system: 'System Events'
    };
    return map[type] || 'Notes';
  }

  /**
   * Log conversation
   */
  async logConversation(userId: string, preview: string, metadata?: any): Promise<void> {
    await this.logEvent({
      type: 'conversation',
      timestamp: new Date().toISOString(),
      userId,
      content: preview.length > 200 ? preview.substring(0, 200) + '...' : preview,
      metadata
    });
  }

  /**
   * Log tool execution
   */
  async logToolExecution(userId: string, toolName: string, status: 'success' | 'error', metadata?: any): Promise<void> {
    const icon = status === 'success' ? '✅' : '❌';
    await this.logEvent({
      type: 'tool',
      timestamp: new Date().toISOString(),
      userId,
      content: `${icon} **${toolName}** - ${status}`,
      metadata
    });
  }

  /**
   * Log important decision
   */
  async logDecision(userId: string, decision: string, rationale?: string): Promise<void> {
    let content = `📋 **Decision:** ${decision}`;
    if (rationale) {
      content += `\n_Rationale: ${rationale}_`;
    }

    await this.logEvent({
      type: 'decision',
      timestamp: new Date().toISOString(),
      userId,
      content
    });
  }

  /**
   * Log learning or insight
   */
  async logLearning(learning: string, context?: string): Promise<void> {
    let content = `💡 **Learning:** ${learning}`;
    if (context) {
      content += `\n_Context: ${context}_`;
    }

    await this.logEvent({
      type: 'learning',
      timestamp: new Date().toISOString(),
      content
    });
  }

  /**
   * Log error
   */
  async logError(error: string, userId?: string, context?: any): Promise<void> {
    await this.logEvent({
      type: 'error',
      timestamp: new Date().toISOString(),
      userId,
      content: `🔴 **Error:** ${error}`,
      metadata: context
    });
  }

  /**
   * Log system event (deploy, restart, etc)
   */
  async logSystemEvent(event: string, details?: string): Promise<void> {
    let content = `🚀 **${event}**`;
    if (details) {
      content += `\n${details}`;
    }

    await this.logEvent({
      type: 'system',
      timestamp: new Date().toISOString(),
      content
    });
  }

  /**
   * Get today's log content
   */
  async getTodayLog(): Promise<string | null> {
    const date = this.getCurrentDate();
    return this.getLogForDate(date);
  }

  /**
   * Get log for specific date
   */
  async getLogForDate(date: string): Promise<string | null> {
    try {
      const filePath = this.getLogFilePath(date);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
      return null;
    } catch (error: any) {
      log.error('[DailyLogger] Failed to read log', { date, error: error.message });
      return null;
    }
  }

  /**
   * Get recent logs (last N days)
   */
  async getRecentLogs(days: number = 3): Promise<Array<{ date: string; content: string }>> {
    const logs: Array<{ date: string; content: string }> = [];

    const today = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const content = await this.getLogForDate(dateStr);
      if (content) {
        logs.push({ date: dateStr, content });
      }
    }

    return logs;
  }

  /**
   * Search logs by keyword
   */
  async searchLogs(keyword: string, days: number = 30): Promise<Array<{ date: string; matches: string[] }>> {
    const results: Array<{ date: string; matches: string[] }> = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const content = await this.getLogForDate(dateStr);
      if (content && content.toLowerCase().includes(keyword.toLowerCase())) {
        const lines = content.split('\n');
        const matches = lines.filter(line =>
          line.toLowerCase().includes(keyword.toLowerCase())
        );
        if (matches.length > 0) {
          results.push({ date: dateStr, matches });
        }
      }
    }

    return results;
  }
}

// Export singleton
export const dailyLogger = new DailyLogger();

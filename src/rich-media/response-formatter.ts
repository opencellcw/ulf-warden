import { log } from '../logger';

/**
 * Rich Media Response Formatter
 * 
 * Transforms plain text responses into rich, interactive media:
 * - Cards (Discord embeds++)
 * - Buttons (one-click actions)
 * - Charts (data visualization)
 * - Progress bars
 * - Tables
 * - Image galleries
 * - Polls
 * 
 * Example:
 *   Input: "Deploy status: 80% complete, 2 errors"
 *   Output: [Progress Bar] ████████░░ 80%
 *           [Button: View Logs] [Button: Rollback]
 *           ⚠️ 2 errors found
 */

export interface RichCard {
  type: 'card';
  title: string;
  description?: string;
  color?: string;
  thumbnail?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: string;
  timestamp?: Date;
}

export interface ActionButton {
  type: 'button';
  label: string;
  action: string;
  style?: 'primary' | 'secondary' | 'success' | 'danger';
  emoji?: string;
}

export interface Chart {
  type: 'chart';
  chartType: 'line' | 'bar' | 'pie' | 'doughnut';
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string;
    }>;
  };
  options?: any;
}

export interface ProgressBar {
  type: 'progress';
  label: string;
  current: number;
  total: number;
  color?: string;
}

export interface Table {
  type: 'table';
  headers: string[];
  rows: string[][];
  style?: 'compact' | 'normal' | 'expanded';
}

export interface ImageGallery {
  type: 'gallery';
  images: Array<{
    url: string;
    caption?: string;
    thumbnail?: string;
  }>;
}

export interface Poll {
  type: 'poll';
  question: string;
  options: string[];
  multipleChoice?: boolean;
  anonymous?: boolean;
}

export type RichMediaElement =
  | RichCard
  | ActionButton
  | Chart
  | ProgressBar
  | Table
  | ImageGallery
  | Poll;

export interface RichResponse {
  text?: string;
  elements: RichMediaElement[];
}

export class ResponseFormatter {
  /**
   * Detect and format rich media elements from text
   */
  formatResponse(text: string): RichResponse {
    const elements: RichMediaElement[] = [];

    // Detect progress bars (e.g., "80% complete", "progress: 75%")
    const progressMatch = text.match(/(\d+)%\s*(complete|done|progress)/i);
    if (progressMatch) {
      const percentage = parseInt(progressMatch[1]);
      elements.push(this.createProgressBar('Progress', percentage, 100));
    }

    // Detect data that could be a chart (numbers in lists)
    if (this.hasChartableData(text)) {
      const chartData = this.extractChartData(text);
      if (chartData) {
        elements.push(chartData);
      }
    }

    // Detect tables (markdown-style or structured data)
    if (text.includes('|') && text.split('\n').length > 2) {
      const table = this.parseMarkdownTable(text);
      if (table) {
        elements.push(table);
      }
    }

    // Detect action suggestions (e.g., "Would you like to...", "You can...")
    if (text.match(/would you like to|you can|click to|press/i)) {
      const buttons = this.extractActionButtons(text);
      elements.push(...buttons);
    }

    return {
      text: elements.length > 0 ? this.cleanTextFromElements(text) : text,
      elements,
    };
  }

  /**
   * Create a rich card
   */
  createCard(options: {
    title: string;
    description?: string;
    color?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  }): RichCard {
    return {
      type: 'card',
      ...options,
      timestamp: new Date(),
    };
  }

  /**
   * Create action buttons
   */
  createButtons(buttons: Array<{ label: string; action: string }>): ActionButton[] {
    return buttons.map(btn => ({
      type: 'button',
      label: btn.label,
      action: btn.action,
      style: 'primary',
    }));
  }

  /**
   * Create progress bar
   */
  createProgressBar(
    label: string,
    current: number,
    total: number,
    color?: string
  ): ProgressBar {
    return {
      type: 'progress',
      label,
      current,
      total,
      color: color || this.getProgressColor(current, total),
    };
  }

  /**
   * Create chart
   */
  createChart(
    chartType: 'line' | 'bar' | 'pie' | 'doughnut',
    labels: string[],
    data: number[],
    label: string = 'Data'
  ): Chart {
    return {
      type: 'chart',
      chartType,
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: this.generateColors(data.length),
        }],
      },
    };
  }

  /**
   * Create table
   */
  createTable(headers: string[], rows: string[][]): Table {
    return {
      type: 'table',
      headers,
      rows,
      style: 'normal',
    };
  }

  /**
   * Render rich response to Discord format
   */
  toDiscordFormat(response: RichResponse): any {
    const embeds: any[] = [];
    let content = response.text || '';

    for (const element of response.elements) {
      switch (element.type) {
        case 'card':
          embeds.push(this.cardToDiscordEmbed(element));
          break;

        case 'progress':
          content += '\n' + this.progressBarToText(element);
          break;

        case 'table':
          content += '\n' + this.tableToText(element);
          break;

        case 'button':
          // Discord buttons handled separately in components
          break;

        case 'chart':
          // Charts would be rendered as images
          content += `\n📊 ${element.chartType} chart (${element.data.labels.length} data points)`;
          break;

        case 'gallery':
          embeds.push({
            title: 'Image Gallery',
            description: `${element.images.length} images`,
          });
          break;

        case 'poll':
          content += '\n' + this.pollToText(element);
          break;
      }
    }

    return { content, embeds };
  }

  /**
   * Convert card to Discord embed
   */
  private cardToDiscordEmbed(card: RichCard): any {
    return {
      title: card.title,
      description: card.description,
      color: card.color ? parseInt(card.color.replace('#', ''), 16) : 0x5865f2,
      fields: card.fields,
      thumbnail: card.thumbnail ? { url: card.thumbnail } : undefined,
      footer: card.footer ? { text: card.footer } : undefined,
      timestamp: card.timestamp?.toISOString(),
    };
  }

  /**
   * Convert progress bar to text
   */
  private progressBarToText(progress: ProgressBar): string {
    const percentage = Math.round((progress.current / progress.total) * 100);
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    return `**${progress.label}:** ${bar} ${percentage}%`;
  }

  /**
   * Convert table to text
   */
  private tableToText(table: Table): string {
    let output = '```\n';
    
    // Headers
    output += table.headers.join(' | ') + '\n';
    output += table.headers.map(() => '---').join(' | ') + '\n';
    
    // Rows
    for (const row of table.rows) {
      output += row.join(' | ') + '\n';
    }
    
    output += '```';
    return output;
  }

  /**
   * Convert poll to text
   */
  private pollToText(poll: Poll): string {
    let output = `📊 **${poll.question}**\n\n`;
    poll.options.forEach((opt, i) => {
      output += `${i + 1}️⃣ ${opt}\n`;
    });
    return output;
  }

  /**
   * Check if text contains chartable data
   */
  private hasChartableData(text: string): boolean {
    const lines = text.split('\n');
    const numbersPerLine = lines.map(line => 
      (line.match(/\d+/g) || []).length
    );
    return numbersPerLine.filter(n => n > 0).length >= 3;
  }

  /**
   * Extract chart data from text
   */
  private extractChartData(text: string): Chart | null {
    // Simple extraction: find lines with labels and numbers
    const lines = text.split('\n').filter(line => /\w+.*\d+/.test(line));
    if (lines.length < 2) return null;

    const labels: string[] = [];
    const data: number[] = [];

    for (const line of lines.slice(0, 10)) { // Max 10 data points
      const match = line.match(/([^:]+):\s*(\d+)/);
      if (match) {
        labels.push(match[1].trim());
        data.push(parseInt(match[2]));
      }
    }

    if (labels.length === 0) return null;

    return this.createChart('bar', labels, data);
  }

  /**
   * Parse markdown table
   */
  private parseMarkdownTable(text: string): Table | null {
    const lines = text.split('\n').filter(line => line.includes('|'));
    if (lines.length < 3) return null;

    const headers = lines[0].split('|')
      .map(h => h.trim())
      .filter(h => h);

    const rows = lines.slice(2).map(line =>
      line.split('|')
        .map(c => c.trim())
        .filter(c => c)
    );

    return this.createTable(headers, rows);
  }

  /**
   * Extract action buttons from text
   */
  private extractActionButtons(text: string): ActionButton[] {
    const buttons: ActionButton[] = [];
    
    // Common action patterns
    const patterns = [
      { regex: /deploy/i, label: 'Deploy', action: 'deploy' },
      { regex: /rollback/i, label: 'Rollback', action: 'rollback' },
      { regex: /logs?/i, label: 'View Logs', action: 'view_logs' },
      { regex: /retry/i, label: 'Retry', action: 'retry' },
      { regex: /cancel/i, label: 'Cancel', action: 'cancel' },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(text)) {
        buttons.push({
          type: 'button',
          label: pattern.label,
          action: pattern.action,
          style: 'primary',
        });
      }
    }

    return buttons.slice(0, 5); // Max 5 buttons
  }

  /**
   * Clean text from extracted elements
   */
  private cleanTextFromElements(text: string): string {
    // Remove progress indicators
    text = text.replace(/\d+%\s*(complete|done|progress)/gi, '');
    
    // Remove markdown tables
    const lines = text.split('\n');
    const cleanLines = lines.filter(line => !line.includes('|') || line.split('|').length < 3);
    
    return cleanLines.join('\n').trim();
  }

  /**
   * Get progress bar color based on percentage
   */
  private getProgressColor(current: number, total: number): string {
    const percentage = (current / total) * 100;
    if (percentage < 30) return '#ef4444'; // red
    if (percentage < 70) return '#f59e0b'; // yellow
    return '#10b981'; // green
  }

  /**
   * Generate colors for chart
   */
  private generateColors(count: number): string[] {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    ];
    return colors.slice(0, count);
  }

  /**
   * Format data as visual ASCII chart
   */
  createASCIIChart(data: { label: string; value: number }[]): string {
    const maxValue = Math.max(...data.map(d => d.value));
    const maxBarLength = 20;

    let output = '```\n';
    for (const item of data) {
      const barLength = Math.round((item.value / maxValue) * maxBarLength);
      const bar = '█'.repeat(barLength);
      output += `${item.label.padEnd(15)} ${bar} ${item.value}\n`;
    }
    output += '```';

    return output;
  }
}

// Singleton
let formatterInstance: ResponseFormatter | null = null;

export function getFormatter(): ResponseFormatter {
  if (!formatterInstance) {
    formatterInstance = new ResponseFormatter();
  }
  return formatterInstance;
}

export const formatter = getFormatter();

import { spawn, ChildProcess } from 'child_process';
import { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from './interface';
import { log } from '../logger';
import { BotTool } from '../bot-factory/types';

/**
 * Pi Coding Agent Provider
 * Uses pi (https://github.com/mariozechner/pi-coding-agent) for agent capabilities
 * Provides bash, read, write, edit, and other tools
 */
export class PiProvider implements LLMProvider {
  name = 'pi';
  private model: string;
  private allowedTools: BotTool[];
  private piProcess: ChildProcess | null = null;
  private workspaceDir: string;

  constructor(
    model?: string,
    allowedTools: BotTool[] = [],
    workspaceDir: string = '/tmp/bot-workspace'
  ) {
    this.model = model || 'claude-sonnet-4-20250514';
    this.allowedTools = allowedTools;
    this.workspaceDir = workspaceDir;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if pi is installed
      const { execSync } = require('child_process');
      execSync('which pi', { stdio: 'ignore' });
      return true;
    } catch {
      log.warn('[Pi] Pi coding agent not found in PATH');
      return false;
    }
  }

  async generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Extract system prompt and user message
      const systemMessages = messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n\n');

      const conversationMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => `${m.role}: ${m.content}`)
        .join('\n\n');

      const fullPrompt = systemMessages
        ? `${systemMessages}\n\n${conversationMessages}`
        : conversationMessages;

      log.debug('[Pi] Generating response', {
        messageCount: messages.length,
        allowedTools: this.allowedTools,
        workspaceDir: this.workspaceDir
      });

      // Spawn pi process in headless mode
      const response = await this.executePi(fullPrompt);

      const processingTime = Date.now() - startTime;

      log.info('[Pi] Generated response', {
        model: this.model,
        processingTime: `${processingTime}ms`,
        responseLength: response.length
      });

      return {
        content: response,
        model: this.model,
        processingTime
      };
    } catch (error: any) {
      log.error('[Pi] Generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute pi in headless mode and return response
   */
  private async executePi(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const piArgs = [
        '--headless',
        '--model', this.model,
        '--cwd', this.workspaceDir
      ];

      // Add tools restrictions if specified
      if (this.allowedTools.length > 0) {
        // Pi doesn't have built-in tool restrictions yet,
        // so we add it as a system message
        const toolRestriction = `\n\nIMPORTANT: You can ONLY use these tools: ${this.allowedTools.join(', ')}. Do not attempt to use any other tools.`;
        prompt = prompt + toolRestriction;
      }

      log.debug('[Pi] Spawning process', { args: piArgs });

      const pi = spawn('pi', piArgs, {
        cwd: this.workspaceDir,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
        }
      });

      let output = '';
      let errorOutput = '';

      pi.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        output += chunk;
        log.debug('[Pi] stdout', { chunk: chunk.substring(0, 200) });
      });

      pi.stderr.on('data', (data: Buffer) => {
        const chunk = data.toString();
        errorOutput += chunk;
        log.debug('[Pi] stderr', { chunk: chunk.substring(0, 200) });
      });

      pi.on('error', (error) => {
        log.error('[Pi] Process error', { error: error.message });
        reject(new Error(`Pi process error: ${error.message}`));
      });

      pi.on('close', (code) => {
        if (code === 0) {
          // Clean up pi output - extract actual response
          const cleanedOutput = this.cleanPiOutput(output);
          log.debug('[Pi] Process completed', {
            code,
            outputLength: cleanedOutput.length
          });
          resolve(cleanedOutput);
        } else {
          log.error('[Pi] Process failed', { code, stderr: errorOutput });
          reject(new Error(`Pi process exited with code ${code}: ${errorOutput}`));
        }
      });

      // Send prompt to pi stdin
      pi.stdin.write(prompt);
      pi.stdin.end();

      // Set timeout for pi execution (5 minutes)
      setTimeout(() => {
        if (pi && !pi.killed) {
          log.warn('[Pi] Process timeout, killing');
          pi.kill();
          reject(new Error('Pi execution timeout after 5 minutes'));
        }
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Clean up pi output to extract actual response
   * Removes debug logs, prompts, etc.
   */
  private cleanPiOutput(output: string): string {
    // Remove ANSI color codes
    let cleaned = output.replace(/\x1b\[[0-9;]*m/g, '');

    // Remove common pi debug lines
    cleaned = cleaned
      .split('\n')
      .filter(line => {
        // Keep lines that look like actual responses
        return !line.startsWith('[') && // Remove [debug] lines
               !line.startsWith('pi>') && // Remove prompts
               !line.includes('Token usage:') && // Remove token stats
               line.trim().length > 0; // Remove empty lines
      })
      .join('\n')
      .trim();

    return cleaned || output; // Fallback to original if cleaning removes everything
  }

  /**
   * Get current model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get allowed tools for this bot
   */
  getAllowedTools(): BotTool[] {
    return this.allowedTools;
  }

  /**
   * Cleanup method - kill pi process if running
   */
  async cleanup(): Promise<void> {
    if (this.piProcess && !this.piProcess.killed) {
      log.info('[Pi] Cleaning up process');
      this.piProcess.kill();
      this.piProcess = null;
    }
  }
}

/**
 * Create Pi provider instance for a bot
 */
export function createPiProvider(
  model: string = 'claude-sonnet-4-20250514',
  allowedTools: BotTool[] = [],
  botId?: string
): PiProvider {
  const workspaceDir = botId 
    ? `/tmp/bot-workspace/${botId}`
    : '/tmp/bot-workspace/default';
  
  return new PiProvider(model, allowedTools, workspaceDir);
}

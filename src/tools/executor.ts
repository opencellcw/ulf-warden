import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const COMMAND_TIMEOUT = 30000; // 30s
const MAX_OUTPUT_LENGTH = 4000; // chars

// Mask sensitive data in output
function maskSecrets(text: string): string {
  return text
    .replace(/sk-ant-[a-zA-Z0-9_-]+/g, 'sk-ant-***MASKED***')
    .replace(/xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+/g, 'xoxb-***MASKED***')
    .replace(/xapp-[0-9]+-[A-Z0-9]+-[0-9]+-[a-f0-9]+/g, 'xapp-***MASKED***')
    .replace(/(password|token|secret|key)[\s=:]+[^\s\n]+/gi, '$1=***MASKED***');
}

// Truncate long output
function truncateOutput(text: string, maxLength: number = MAX_OUTPUT_LENGTH): string {
  if (text.length <= maxLength) return text;
  const half = Math.floor(maxLength / 2);
  return text.slice(0, half) + '\n\n... [OUTPUT TRUNCATED] ...\n\n' + text.slice(-half);
}

export async function executeShell(command: string): Promise<string> {
  try {
    console.log(`[Executor] Running: ${command}`);

    const { stdout, stderr } = await execAsync(command, {
      timeout: COMMAND_TIMEOUT,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    const output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');
    const masked = maskSecrets(output);
    const truncated = truncateOutput(masked);

    console.log(`[Executor] Success: ${command.substring(0, 50)}...`);
    return truncated || '[Command executed successfully - no output]';
  } catch (error: any) {
    console.error(`[Executor] Error: ${error.message}`);

    if (error.killed) {
      throw new Error(`Command timeout after ${COMMAND_TIMEOUT}ms`);
    }

    const errorMsg = error.message || error.stderr || 'Command failed';
    throw new Error(maskSecrets(errorMsg));
  }
}

export async function writeFile(filePath: string, content: string): Promise<string> {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');

    console.log(`[Executor] File written: ${filePath}`);
    return `File written successfully: ${filePath}`;
  } catch (error: any) {
    console.error(`[Executor] Write error: ${error.message}`);
    throw new Error(`Failed to write file: ${error.message}`);
  }
}

export async function readFile(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const truncated = truncateOutput(content);

    console.log(`[Executor] File read: ${filePath}`);
    return truncated;
  } catch (error: any) {
    console.error(`[Executor] Read error: ${error.message}`);
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

export async function listDirectory(dirPath: string = '.'): Promise<string> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const lines = entries.map(entry => {
      const type = entry.isDirectory() ? 'DIR ' : 'FILE';
      return `${type} ${entry.name}`;
    });

    console.log(`[Executor] Listed directory: ${dirPath}`);
    return lines.join('\n') || '[Empty directory]';
  } catch (error: any) {
    console.error(`[Executor] List error: ${error.message}`);
    throw new Error(`Failed to list directory: ${error.message}`);
  }
}

export async function getProcessInfo(): Promise<string> {
  try {
    const { stdout } = await execAsync('ps aux --sort=-%mem | head -20');
    return truncateOutput(stdout);
  } catch (error: any) {
    throw new Error(`Failed to get process info: ${error.message}`);
  }
}

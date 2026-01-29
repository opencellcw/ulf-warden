import fs from 'fs';
import path from 'path';

export class WorkspaceLoader {
  private workspacePath: string;
  private soul: string = '';
  private memory: string = '';

  constructor(workspacePath: string = './workspace') {
    this.workspacePath = workspacePath;
    this.load();
  }

  private load(): void {
    try {
      const soulPath = path.join(this.workspacePath, 'SOUL.md');
      const memoryPath = path.join(this.workspacePath, 'MEMORY.md');

      if (fs.existsSync(soulPath)) {
        this.soul = fs.readFileSync(soulPath, 'utf-8');
        console.log('[Workspace] Loaded SOUL.md');
      } else {
        console.warn('[Workspace] SOUL.md not found');
      }

      if (fs.existsSync(memoryPath)) {
        this.memory = fs.readFileSync(memoryPath, 'utf-8');
        console.log('[Workspace] Loaded MEMORY.md');
      } else {
        console.warn('[Workspace] MEMORY.md not found');
      }
    } catch (error) {
      console.error('[Workspace] Error loading files:', error);
    }
  }

  getSystemPrompt(): string {
    const parts: string[] = [];

    if (this.soul) {
      parts.push(this.soul);
    }

    if (this.memory) {
      parts.push('\n---\n# MEMORY\n');
      parts.push(this.memory);
    }

    return parts.join('\n');
  }

  reload(): void {
    console.log('[Workspace] Reloading workspace files...');
    this.load();
  }
}

export const workspace = new WorkspaceLoader();

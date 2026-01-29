import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WorkspaceLoader {
  private workspacePath: string;
  private soul: string = '';
  private identity: string = '';
  private memory: string = '';
  private agents: string = '';

  constructor(workspacePath: string = './workspace') {
    this.workspacePath = workspacePath;
    this.load();
  }

  private load(): void {
    try {
      const files = ['SOUL.md', 'IDENTITY.md', 'MEMORY.md', 'AGENTS.md'];

      for (const file of files) {
        const filePath = path.join(this.workspacePath, file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          const key = file.replace('.md', '').toLowerCase();
          (this as any)[key] = content;
          console.log(`[Workspace] ✓ Loaded ${file}`);
        } else {
          console.warn(`[Workspace] ⚠ ${file} not found`);
        }
      }
    } catch (error) {
      console.error('[Workspace] Error loading files:', error);
    }
  }

  getSystemPrompt(): string {
    const parts: string[] = [];

    if (this.identity) parts.push(this.identity);
    if (this.soul) parts.push('\n---\n', this.soul);
    if (this.agents) parts.push('\n---\n', this.agents);
    if (this.memory) parts.push('\n---\n# MEMORY\n', this.memory);

    return parts.join('\n');
  }

  reload(): void {
    console.log('[Workspace] Reloading workspace files...');
    this.load();
  }
}

export const workspace = new WorkspaceLoader();

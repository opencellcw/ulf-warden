import fs from 'fs';
import path from 'path';

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

  async updateMemory(newContent: string): Promise<void> {
    try {
      const memoryPath = path.join(this.workspacePath, 'MEMORY.md');

      // Read current memory
      const current = this.memory;

      // Append new content
      const updated = current ? `${current}\n\n${newContent}` : newContent;

      // Write back to disk
      fs.writeFileSync(memoryPath, updated, 'utf-8');

      // Reload in-memory
      this.memory = updated;

      console.log('[Workspace] ✓ Updated MEMORY.md');
    } catch (error) {
      console.error('[Workspace] Failed to update memory:', error);
      throw error;
    }
  }

  async commitToGit(message: string): Promise<void> {
    try {
      // This is optional - only commit if git is available and repo exists
      const { execSync } = require('child_process');

      // Check if we're in a git repo
      try {
        execSync('git rev-parse --is-inside-work-tree', { cwd: this.workspacePath, stdio: 'ignore' });
      } catch {
        // Not a git repo, skip
        return;
      }

      // Add and commit
      execSync(`git add ${path.join(this.workspacePath, 'MEMORY.md')}`, { cwd: this.workspacePath });
      execSync(`git commit -m "chore: update memory - ${message}"`, { cwd: this.workspacePath });

      console.log('[Workspace] ✓ Committed changes to git');
    } catch (error) {
      // Silent fail - git operations are optional
      console.warn('[Workspace] Git commit skipped:', error);
    }
  }

  async saveState(): Promise<void> {
    console.log('[Workspace] Saving workspace state...');
    // Currently no state to save beyond what's already in files
    // This method exists for future expansion
  }
}

export const workspace = new WorkspaceLoader();

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.workspace = exports.WorkspaceLoader = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class WorkspaceLoader {
    workspacePath;
    soul = '';
    identity = '';
    memory = '';
    agents = '';
    constructor(workspacePath = './workspace') {
        this.workspacePath = workspacePath;
        this.load();
    }
    load() {
        try {
            const files = ['SOUL.md', 'IDENTITY.md', 'MEMORY.md', 'AGENTS.md'];
            for (const file of files) {
                const filePath = path_1.default.join(this.workspacePath, file);
                if (fs_1.default.existsSync(filePath)) {
                    const content = fs_1.default.readFileSync(filePath, 'utf-8');
                    const key = file.replace('.md', '').toLowerCase();
                    this[key] = content;
                    console.log(`[Workspace] ✓ Loaded ${file}`);
                }
                else {
                    console.warn(`[Workspace] ⚠ ${file} not found`);
                }
            }
        }
        catch (error) {
            console.error('[Workspace] Error loading files:', error);
        }
    }
    getSystemPrompt() {
        const parts = [];
        if (this.identity)
            parts.push(this.identity);
        if (this.soul)
            parts.push('\n---\n', this.soul);
        if (this.agents)
            parts.push('\n---\n', this.agents);
        if (this.memory)
            parts.push('\n---\n# MEMORY\n', this.memory);
        return parts.join('\n');
    }
    reload() {
        console.log('[Workspace] Reloading workspace files...');
        this.load();
    }
    async updateMemory(newContent) {
        try {
            const memoryPath = path_1.default.join(this.workspacePath, 'MEMORY.md');
            // Read current memory
            const current = this.memory;
            // Append new content
            const updated = current ? `${current}\n\n${newContent}` : newContent;
            // Write back to disk
            fs_1.default.writeFileSync(memoryPath, updated, 'utf-8');
            // Reload in-memory
            this.memory = updated;
            console.log('[Workspace] ✓ Updated MEMORY.md');
        }
        catch (error) {
            console.error('[Workspace] Failed to update memory:', error);
            throw error;
        }
    }
    async commitToGit(message) {
        try {
            // This is optional - only commit if git is available and repo exists
            const { execSync } = require('child_process');
            // Check if we're in a git repo
            try {
                execSync('git rev-parse --is-inside-work-tree', { cwd: this.workspacePath, stdio: 'ignore' });
            }
            catch {
                // Not a git repo, skip
                return;
            }
            // Add and commit
            execSync(`git add ${path_1.default.join(this.workspacePath, 'MEMORY.md')}`, { cwd: this.workspacePath });
            execSync(`git commit -m "chore: update memory - ${message}"`, { cwd: this.workspacePath });
            console.log('[Workspace] ✓ Committed changes to git');
        }
        catch (error) {
            // Silent fail - git operations are optional
            console.warn('[Workspace] Git commit skipped:', error);
        }
    }
    async saveState() {
        console.log('[Workspace] Saving workspace state...');
        // Currently no state to save beyond what's already in files
        // This method exists for future expansion
    }
}
exports.WorkspaceLoader = WorkspaceLoader;
exports.workspace = new WorkspaceLoader();

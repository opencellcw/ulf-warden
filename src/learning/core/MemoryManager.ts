/**
 * Memory Manager
 * Gerencia MEMORY.md automaticamente com compress, updates e knowledge graph
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { Learning, MemoryUpdate, RollbackCheckpoint } from '../types';
import { log } from '../../logger';

export class MemoryManager {
  private memoryPath: string;
  private backupDir: string;
  private client: Anthropic;
  private readonly MAX_UPDATES_PER_HOUR = 5;
  private updateCount = 0;
  private updateResetTime = Date.now();

  constructor(memoryPath: string = '/data/core/MEMORY.md') {
    this.memoryPath = memoryPath;
    this.backupDir = path.join(path.dirname(memoryPath), '..', 'backups');
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Atualiza memória com novos learnings
   */
  async updateMemory(learnings: Learning[]): Promise<void> {
    if (learnings.length === 0) return;

    // Rate limiting
    if (!this.checkRateLimit()) {
      log.warn('[MemoryManager] Rate limit exceeded, queuing updates');
      return;
    }

    try {
      log.info('[MemoryManager] Updating memory', { learningCount: learnings.length });

      // 1. Backup current memory
      await this.createBackup('memory');

      // 2. Load current memory
      const currentMemory = await this.loadMemory();

      // 3. Generate updated memory using Claude
      const updatedMemory = await this.generateUpdatedMemory(currentMemory, learnings);

      // 4. Validate update
      if (await this.validateMemory(updatedMemory)) {
        await this.writeMemory(updatedMemory);
        log.info('[MemoryManager] Memory updated successfully');
      } else {
        log.error('[MemoryManager] Memory validation failed, rolling back');
        await this.restoreBackup();
      }

    } catch (error: any) {
      log.error('[MemoryManager] Memory update failed', { error: error.message });
      await this.restoreBackup();
    }
  }

  /**
   * Compressão inteligente de memórias antigas
   */
  async compressOldMemories(): Promise<void> {
    try {
      log.info('[MemoryManager] Starting memory compression');

      const currentMemory = await this.loadMemory();

      const compressionPrompt = `Analyze this memory file and compress old/redundant information while preserving essential insights:

${currentMemory}

Instructions:
1. Identify repetitive or low-value information
2. Compress detailed examples into general patterns
3. Merge similar concepts
4. PRESERVE all high-importance learnings
5. Keep structure and formatting
6. Maintain all recent learnings (< 30 days)

Return the compressed memory maintaining the same markdown format.`;

      const response = await this.client.messages.create({
        model: 'claude-opus-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: compressionPrompt
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const compressedMemory = content.text;

      // Stats
      const originalSize = Buffer.byteLength(currentMemory, 'utf8');
      const compressedSize = Buffer.byteLength(compressedMemory, 'utf8');
      const ratio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

      log.info('[MemoryManager] Compression complete', {
        originalSize,
        compressedSize,
        ratio: `${ratio}%`
      });

      // Backup and write
      await this.createBackup('compression');
      await this.writeMemory(compressedMemory);

    } catch (error: any) {
      log.error('[MemoryManager] Compression failed', { error: error.message });
      await this.restoreBackup();
    }
  }

  /**
   * Gera memória atualizada usando Claude
   */
  private async generateUpdatedMemory(currentMemory: string, learnings: Learning[]): Promise<string> {
    const learningsText = learnings
      .map(l => `[${l.category}] ${l.content} (confidence: ${l.confidence}, importance: ${l.importance})`)
      .join('\n');

    const prompt = `Update this memory file with new learnings while maintaining structure and quality:

CURRENT MEMORY:
${currentMemory}

NEW LEARNINGS:
${learningsText}

Instructions:
1. Integrate new learnings into appropriate sections
2. Maintain markdown structure and formatting
3. Avoid duplication - merge with existing knowledge
4. Categorize properly (Technical, Personal, Context, etc.)
5. Keep high-quality, actionable information only
6. Preserve the tone and style of existing memory

Return the updated MEMORY.md content.`;

    const response = await this.client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return content.text;
  }

  /**
   * Carrega memória atual
   */
  private async loadMemory(): Promise<string> {
    try {
      return await fs.readFile(this.memoryPath, 'utf-8');
    } catch (error) {
      log.warn('[MemoryManager] Memory file not found, creating new');
      return this.getDefaultMemory();
    }
  }

  /**
   * Escreve memória atualizada
   */
  private async writeMemory(content: string): Promise<void> {
    // Ensure directory exists
    await fs.mkdir(path.dirname(this.memoryPath), { recursive: true });
    await fs.writeFile(this.memoryPath, content, 'utf-8');
  }

  /**
   * Valida que memória está íntegra
   */
  private async validateMemory(memory: string): Promise<boolean> {
    // Basic validation
    if (!memory || memory.length < 100) return false;
    if (!memory.includes('#')) return false; // Must have headers

    // Size check - shouldn't grow too much
    try {
      const currentMemory = await this.loadMemory();
      const currentSize = Buffer.byteLength(currentMemory, 'utf8');
      const newSize = Buffer.byteLength(memory, 'utf8');

      // Reject if more than 2x growth
      if (newSize > currentSize * 2) {
        log.warn('[MemoryManager] Memory grew too much', { currentSize, newSize });
        return false;
      }
    } catch (error) {
      // If current doesn't exist, any size is ok
    }

    return true;
  }

  /**
   * Cria backup da memória
   */
  private async createBackup(type: string): Promise<string> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `memory_${type}_${timestamp}.md`);

      const currentMemory = await this.loadMemory();
      await fs.writeFile(backupPath, currentMemory, 'utf-8');

      log.info('[MemoryManager] Backup created', { backupPath });
      return backupPath;
    } catch (error: any) {
      log.error('[MemoryManager] Backup failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Restaura do backup mais recente
   */
  private async restoreBackup(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter(f => f.startsWith('memory_'))
        .sort()
        .reverse();

      if (backups.length === 0) {
        log.warn('[MemoryManager] No backups found');
        return;
      }

      const latestBackup = path.join(this.backupDir, backups[0]);
      const backupContent = await fs.readFile(latestBackup, 'utf-8');
      await this.writeMemory(backupContent);

      log.info('[MemoryManager] Restored from backup', { backup: backups[0] });
    } catch (error: any) {
      log.error('[MemoryManager] Restore failed', { error: error.message });
    }
  }

  /**
   * Rate limiting check
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    // Reset counter if hour passed
    if (now - this.updateResetTime > hourInMs) {
      this.updateCount = 0;
      this.updateResetTime = now;
    }

    if (this.updateCount >= this.MAX_UPDATES_PER_HOUR) {
      return false;
    }

    this.updateCount++;
    return true;
  }

  /**
   * Memória default se não existir
   */
  private getDefaultMemory(): string {
    return `# MEMORY.md - Conhecimento Acumulado

## Técnico
*Learnings técnicos aparecem aqui automaticamente*

## Pessoal
*Preferências dos usuários e contexto pessoal*

## Contexto
*Contexto organizacional e processos*

## Comportamental
*Padrões de interação e feedback*

---
*Este arquivo é gerenciado automaticamente pelo sistema de learning*
*Última atualização: ${new Date().toISOString()}*
`;
  }
}

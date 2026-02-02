"use strict";
/**
 * Memory Manager
 * Gerencia MEMORY.md automaticamente com compress, updates e knowledge graph
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryManager = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const logger_1 = require("../../logger");
class MemoryManager {
    memoryPath;
    backupDir;
    client;
    MAX_UPDATES_PER_HOUR = 5;
    updateCount = 0;
    updateResetTime = Date.now();
    constructor(memoryPath = '/data/core/MEMORY.md') {
        this.memoryPath = memoryPath;
        this.backupDir = path.join(path.dirname(memoryPath), '..', 'backups');
        this.client = new sdk_1.default({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }
    /**
     * Atualiza memória com novos learnings
     */
    async updateMemory(learnings) {
        if (learnings.length === 0)
            return;
        // Rate limiting
        if (!this.checkRateLimit()) {
            logger_1.log.warn('[MemoryManager] Rate limit exceeded, queuing updates');
            return;
        }
        try {
            logger_1.log.info('[MemoryManager] Updating memory', { learningCount: learnings.length });
            // 1. Backup current memory
            await this.createBackup('memory');
            // 2. Load current memory
            const currentMemory = await this.loadMemory();
            // 3. Generate updated memory using Claude
            const updatedMemory = await this.generateUpdatedMemory(currentMemory, learnings);
            // 4. Validate update
            if (await this.validateMemory(updatedMemory)) {
                await this.writeMemory(updatedMemory);
                logger_1.log.info('[MemoryManager] Memory updated successfully');
            }
            else {
                logger_1.log.error('[MemoryManager] Memory validation failed, rolling back');
                await this.restoreBackup();
            }
        }
        catch (error) {
            logger_1.log.error('[MemoryManager] Memory update failed', { error: error.message });
            await this.restoreBackup();
        }
    }
    /**
     * Compressão inteligente de memórias antigas
     */
    async compressOldMemories() {
        try {
            logger_1.log.info('[MemoryManager] Starting memory compression');
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
                model: 'claude-sonnet-4-20250514',
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
            logger_1.log.info('[MemoryManager] Compression complete', {
                originalSize,
                compressedSize,
                ratio: `${ratio}%`
            });
            // Backup and write
            await this.createBackup('compression');
            await this.writeMemory(compressedMemory);
        }
        catch (error) {
            logger_1.log.error('[MemoryManager] Compression failed', { error: error.message });
            await this.restoreBackup();
        }
    }
    /**
     * Gera memória atualizada usando Claude
     */
    async generateUpdatedMemory(currentMemory, learnings) {
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
            model: 'claude-sonnet-4-20250514',
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
    async loadMemory() {
        try {
            return await fs.readFile(this.memoryPath, 'utf-8');
        }
        catch (error) {
            logger_1.log.warn('[MemoryManager] Memory file not found, creating new');
            return this.getDefaultMemory();
        }
    }
    /**
     * Escreve memória atualizada
     */
    async writeMemory(content) {
        // Ensure directory exists
        await fs.mkdir(path.dirname(this.memoryPath), { recursive: true });
        await fs.writeFile(this.memoryPath, content, 'utf-8');
    }
    /**
     * Valida que memória está íntegra
     */
    async validateMemory(memory) {
        // Basic validation
        if (!memory || memory.length < 100)
            return false;
        if (!memory.includes('#'))
            return false; // Must have headers
        // Size check - shouldn't grow too much
        try {
            const currentMemory = await this.loadMemory();
            const currentSize = Buffer.byteLength(currentMemory, 'utf8');
            const newSize = Buffer.byteLength(memory, 'utf8');
            // Reject if more than 2x growth
            if (newSize > currentSize * 2) {
                logger_1.log.warn('[MemoryManager] Memory grew too much', { currentSize, newSize });
                return false;
            }
        }
        catch (error) {
            // If current doesn't exist, any size is ok
        }
        return true;
    }
    /**
     * Cria backup da memória
     */
    async createBackup(type) {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(this.backupDir, `memory_${type}_${timestamp}.md`);
            const currentMemory = await this.loadMemory();
            await fs.writeFile(backupPath, currentMemory, 'utf-8');
            logger_1.log.info('[MemoryManager] Backup created', { backupPath });
            return backupPath;
        }
        catch (error) {
            logger_1.log.error('[MemoryManager] Backup failed', { error: error.message });
            throw error;
        }
    }
    /**
     * Restaura do backup mais recente
     */
    async restoreBackup() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backups = files
                .filter(f => f.startsWith('memory_'))
                .sort()
                .reverse();
            if (backups.length === 0) {
                logger_1.log.warn('[MemoryManager] No backups found');
                return;
            }
            const latestBackup = path.join(this.backupDir, backups[0]);
            const backupContent = await fs.readFile(latestBackup, 'utf-8');
            await this.writeMemory(backupContent);
            logger_1.log.info('[MemoryManager] Restored from backup', { backup: backups[0] });
        }
        catch (error) {
            logger_1.log.error('[MemoryManager] Restore failed', { error: error.message });
        }
    }
    /**
     * Rate limiting check
     */
    checkRateLimit() {
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
    getDefaultMemory() {
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
exports.MemoryManager = MemoryManager;

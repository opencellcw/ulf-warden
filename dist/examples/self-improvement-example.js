"use strict";
/**
 * Example: How to use the Self-Improvement System
 *
 * This system allows Ulf to propose changes to itself that require
 * human approval before being applied.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exampleBugFix = exampleBugFix;
exports.exampleNewFeature = exampleNewFeature;
exports.exampleRefactor = exampleRefactor;
const self_improvement_1 = require("../self-improvement");
// Example 1: Fix a bug
async function exampleBugFix(discordChannel) {
    const proposal = {
        title: 'Fix memory leak in session manager',
        description: 'Adiciona limpeza automática de sessões antigas para prevenir memory leak',
        reason: 'Detectado crescimento de memória após 24h de operação contínua',
        priority: 'high',
        changes: [
            {
                filePath: 'src/sessions.ts',
                action: 'modify',
                content: `
// ... código existente ...

// Adiciona cleanup automático
setInterval(() => {
  this.cleanupOldSessions();
}, 60 * 60 * 1000); // Cada hora
`,
            },
        ],
    };
    await self_improvement_1.selfImprovementSystem.proposeImprovement(discordChannel, proposal);
}
// Example 2: Add new feature
async function exampleNewFeature(discordChannel) {
    const proposal = {
        title: 'Add /stats command',
        description: 'Adiciona comando para mostrar estatísticas de uso do bot',
        reason: 'Solicitado por usuários para monitorar performance',
        priority: 'medium',
        changes: [
            {
                filePath: 'src/commands/stats.ts',
                action: 'create',
                content: `
export async function showStats(userId: string): Promise<string> {
  // Implementation
  return 'Stats here';
}
`,
            },
            {
                filePath: 'src/handlers/discord.ts',
                action: 'modify',
                content: `
// Add stats command handler
if (text === '/stats') {
  const stats = await showStats(userId);
  await message.reply(stats);
  return;
}
`,
            },
        ],
    };
    await self_improvement_1.selfImprovementSystem.proposeImprovement(discordChannel, proposal);
}
// Example 3: Refactor code
async function exampleRefactor(discordChannel) {
    const proposal = {
        title: 'Refactor media handler to use async/await',
        description: 'Moderniza media handler para usar async/await ao invés de callbacks',
        reason: 'Melhora legibilidade e tratamento de erros',
        priority: 'low',
        changes: [
            {
                filePath: 'src/media-handler.ts',
                action: 'modify',
                content: `
// Refactored code here
`,
            },
        ],
    };
    await self_improvement_1.selfImprovementSystem.proposeImprovement(discordChannel, proposal);
}
/**
 * Como usar no código do agent:
 *
 * 1. Detectar necessidade de melhoria
 * 2. Criar proposal
 * 3. Chamar selfImprovementSystem.proposeImprovement()
 * 4. Usuário autorizado recebe embed com botões
 * 5. Se aprovado: build + deploy automático
 * 6. Bot reinicia com as mudanças
 */

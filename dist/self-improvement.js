"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.selfImprovementSystem = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const approval_system_1 = require("./approval-system");
const logger_1 = require("./logger");
const crypto = __importStar(require("crypto"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SelfImprovementSystem {
    AUTHORIZED_USER_IDS = process.env.DISCORD_ADMIN_USER_IDS?.split(',') || [];
    async proposeImprovement(channel, proposal) {
        if (this.AUTHORIZED_USER_IDS.length === 0) {
            logger_1.log.warn('[SelfImprovement] No authorized users configured');
            return;
        }
        const requestId = crypto.randomBytes(8).toString('hex');
        // Generate diffs for modified files
        const changes = await Promise.all(proposal.changes.map(async (change) => {
            let diff;
            if (change.action === 'modify') {
                try {
                    // Generate diff using git
                    const { stdout } = await execAsync(`git diff --no-index /dev/null ${change.filePath} 2>/dev/null || echo ""`);
                    diff = stdout || 'No diff available';
                }
                catch (error) {
                    diff = 'Could not generate diff';
                }
            }
            return {
                file: change.filePath,
                diff,
                action: change.action,
            };
        }));
        const request = {
            id: requestId,
            title: proposal.title,
            description: `${proposal.description}\n\n**Motivo:** ${proposal.reason}\n**Prioridade:** ${proposal.priority}`,
            changes,
            authorizedUsers: this.AUTHORIZED_USER_IDS,
            onApprove: async () => {
                await this.applyImprovement(channel, proposal);
            },
            onDecline: async () => {
                logger_1.log.info('[SelfImprovement] Improvement declined', { title: proposal.title });
            },
        };
        await approval_system_1.approvalSystem.requestApproval(channel, request);
    }
    async applyImprovement(channel, proposal) {
        try {
            logger_1.log.info('[SelfImprovement] Applying improvement', { title: proposal.title });
            // Apply file changes
            for (const change of proposal.changes) {
                if (change.action === 'create' || change.action === 'modify') {
                    const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                    await fs.writeFile(change.filePath, change.content, 'utf-8');
                    logger_1.log.info('[SelfImprovement] File written', { file: change.filePath });
                }
                else if (change.action === 'delete') {
                    const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                    await fs.unlink(change.filePath);
                    logger_1.log.info('[SelfImprovement] File deleted', { file: change.filePath });
                }
            }
            // Build TypeScript
            await channel.send('🔨 Building TypeScript...');
            await execAsync('npm run build');
            // Build Docker image
            await channel.send('🐳 Building Docker image...');
            const { stdout: buildOutput } = await execAsync('gcloud builds submit --tag us-central1-docker.pkg.dev/opencellcw-k8s/ulf-images/ulf-warden:latest --quiet .');
            logger_1.log.info('[SelfImprovement] Docker build complete', { output: buildOutput.substring(0, 200) });
            // Deploy to Kubernetes
            await channel.send('🚀 Deploying to Kubernetes...');
            await execAsync('kubectl rollout restart deployment/ulf-warden-agent -n agents');
            // Wait for rollout
            await execAsync('kubectl rollout status deployment/ulf-warden-agent -n agents --timeout=300s');
            await channel.send('✅ **Improvement deployed successfully!**\n\nReiniciando em alguns segundos...');
            logger_1.log.info('[SelfImprovement] Improvement applied successfully', { title: proposal.title });
        }
        catch (error) {
            logger_1.log.error('[SelfImprovement] Failed to apply improvement', {
                title: proposal.title,
                error: error.message,
            });
            await channel.send(`❌ **Erro ao aplicar mudanças:**\n\`\`\`\n${error.message}\n\`\`\``);
            throw error;
        }
    }
    /**
     * Analyze error and propose fix
     */
    async analyzeAndProposeFix(channel, error, context) {
        // This would use Claude to analyze the error and propose a fix
        // For now, just log
        logger_1.log.info('[SelfImprovement] Error analysis requested', {
            error: error.message,
            context,
        });
        // TODO: Use Claude API to analyze error and generate fix proposal
    }
    /**
     * Propose improvement based on user feedback
     */
    async proposeFromFeedback(channel, feedback, userId) {
        logger_1.log.info('[SelfImprovement] Feedback received', { feedback, userId });
        // TODO: Use Claude API to generate improvement from feedback
    }
}
exports.selfImprovementSystem = new SelfImprovementSystem();

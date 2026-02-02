import { exec } from 'child_process';
import { promisify } from 'util';
import { approvalSystem, ApprovalRequest } from './approval-system';
import { log } from './logger';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface ImprovementProposal {
  title: string;
  description: string;
  changes: {
    filePath: string;
    content: string;
    action: 'create' | 'modify' | 'delete';
  }[];
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

class SelfImprovementSystem {
  private readonly AUTHORIZED_USER_IDS: string[] = process.env.DISCORD_ADMIN_USER_IDS?.split(',') || [];

  async proposeImprovement(
    channel: any,
    proposal: ImprovementProposal
  ): Promise<void> {
    if (this.AUTHORIZED_USER_IDS.length === 0) {
      log.warn('[SelfImprovement] No authorized users configured');
      return;
    }

    const requestId = crypto.randomBytes(8).toString('hex');

    // Generate diffs for modified files
    const changes = await Promise.all(
      proposal.changes.map(async (change) => {
        let diff: string | undefined;

        if (change.action === 'modify') {
          try {
            // Generate diff using git
            const { stdout } = await execAsync(
              `git diff --no-index /dev/null ${change.filePath} 2>/dev/null || echo ""`
            );
            diff = stdout || 'No diff available';
          } catch (error) {
            diff = 'Could not generate diff';
          }
        }

        return {
          file: change.filePath,
          diff,
          action: change.action,
        };
      })
    );

    const request: ApprovalRequest = {
      id: requestId,
      title: proposal.title,
      description: `${proposal.description}\n\n**Motivo:** ${proposal.reason}\n**Prioridade:** ${proposal.priority}`,
      changes,
      authorizedUsers: this.AUTHORIZED_USER_IDS,
      onApprove: async () => {
        await this.applyImprovement(channel, proposal);
      },
      onDecline: async () => {
        log.info('[SelfImprovement] Improvement declined', { title: proposal.title });
      },
    };

    await approvalSystem.requestApproval(channel, request);
  }

  private async applyImprovement(channel: any, proposal: ImprovementProposal): Promise<void> {
    try {
      log.info('[SelfImprovement] Applying improvement', { title: proposal.title });

      // Apply file changes
      for (const change of proposal.changes) {
        if (change.action === 'create' || change.action === 'modify') {
          const fs = await import('fs/promises');
          await fs.writeFile(change.filePath, change.content, 'utf-8');
          log.info('[SelfImprovement] File written', { file: change.filePath });
        } else if (change.action === 'delete') {
          const fs = await import('fs/promises');
          await fs.unlink(change.filePath);
          log.info('[SelfImprovement] File deleted', { file: change.filePath });
        }
      }

      // Build TypeScript
      await channel.send('🔨 Building TypeScript...');
      await execAsync('npm run build');

      // Build Docker image
      await channel.send('🐳 Building Docker image...');
      const { stdout: buildOutput } = await execAsync(
        'gcloud builds submit --tag us-central1-docker.pkg.dev/opencellcw-k8s/ulf-images/ulf-warden:latest --quiet .'
      );
      log.info('[SelfImprovement] Docker build complete', { output: buildOutput.substring(0, 200) });

      // Deploy to Kubernetes
      await channel.send('🚀 Deploying to Kubernetes...');
      await execAsync('kubectl rollout restart deployment/ulf-warden-agent -n agents');

      // Wait for rollout
      await execAsync('kubectl rollout status deployment/ulf-warden-agent -n agents --timeout=300s');

      await channel.send('✅ **Improvement deployed successfully!**\n\nReiniciando em alguns segundos...');

      log.info('[SelfImprovement] Improvement applied successfully', { title: proposal.title });
    } catch (error: any) {
      log.error('[SelfImprovement] Failed to apply improvement', {
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
  async analyzeAndProposeFix(
    channel: any,
    error: Error,
    context: string
  ): Promise<void> {
    // This would use Claude to analyze the error and propose a fix
    // For now, just log
    log.info('[SelfImprovement] Error analysis requested', {
      error: error.message,
      context,
    });

    // TODO: Use Claude API to analyze error and generate fix proposal
  }

  /**
   * Propose improvement based on user feedback
   */
  async proposeFromFeedback(
    channel: any,
    feedback: string,
    userId: string
  ): Promise<void> {
    log.info('[SelfImprovement] Feedback received', { feedback, userId });

    // TODO: Use Claude API to generate improvement from feedback
  }
}

export const selfImprovementSystem = new SelfImprovementSystem();

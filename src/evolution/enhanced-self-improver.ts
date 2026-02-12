import { SelfImprover } from './self-improver';
import { SkillsLibrary, Skill } from './skills';
import { RollbackGuard, HealthMetrics } from './monitoring';
import { ImprovementProposal } from './types';
import { log } from '../logger';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Enhanced Self-Improver with Skills Library and Auto-Rollback
 * 
 * Features:
 * - Learns from successful implementations (Skills Library)
 * - Reuses proven code patterns
 * - Auto-rollback on deployment failure
 * - Health monitoring post-deployment
 */
export class EnhancedSelfImprover extends SelfImprover {
  private skillsLibrary: SkillsLibrary;
  private rollbackGuard: RollbackGuard;

  constructor(claude: Anthropic) {
    super(claude);
    this.skillsLibrary = new SkillsLibrary();
    this.rollbackGuard = new RollbackGuard();
    log.info('[EnhancedSelfImprover] ✅ Initialized with Skills Library + Auto-Rollback');
  }

  /**
   * Enhanced propose with skills reuse
   */
  async proposeImprovement(idea: string): Promise<ImprovementProposal> {
    log.info('[EnhancedSelfImprover] 🧠 Analyzing idea with skills library...');

    // Search for similar skills
    const similarSkills = await this.skillsLibrary.findSimilar(idea, 3, 0.7);
    
    if (similarSkills.length > 0) {
      log.info(`[EnhancedSelfImprover] 📚 Found ${similarSkills.length} similar skills`);
      similarSkills.forEach((result, i) => {
        log.info(`  ${i + 1}. ${result.skill.name} (${(result.similarity * 100).toFixed(1)}% similar, ${result.skill.successRate.toFixed(0)}% success)`);
      });
    }

    // Call parent proposeImprovement (existing logic)
    const proposal = await super.proposeImprovement(idea);

    // Enhance proposal with similar skills context
    if (similarSkills.length > 0) {
      const bestSkill = similarSkills[0].skill;
      log.info(`[EnhancedSelfImprover] 💡 Suggesting reuse of skill: ${bestSkill.name}`);
      
      // Add skill reference to proposal (for implementation phase)
      (proposal as any).suggestedSkills = similarSkills.map(r => ({
        name: r.skill.name,
        description: r.skill.description,
        code: r.skill.code,
        similarity: r.similarity,
        successRate: r.skill.successRate
      }));
    }

    return proposal;
  }

  /**
   * Enhanced implementation with skills reuse
   */
  async implementProposal(proposal: ImprovementProposal): Promise<void> {
    log.info('[EnhancedSelfImprover] 🔨 Implementing with skills context...');

    try {
      // Call parent implementation
      await super.implementProposal(proposal);

      // Save successful implementation as a skill
      await this.saveAsSkill(proposal);

    } catch (error: any) {
      log.error('[EnhancedSelfImprover] ❌ Implementation failed:', error.message);
      throw error;
    }
  }

  /**
   * Enhanced deployment with auto-rollback
   */
  async deployProposal(
    proposal: ImprovementProposal,
    options: {
      monitoringDuration?: number;
      autoRollback?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    rolledBack: boolean;
    reason?: string;
    metrics?: HealthMetrics;
  }> {
    log.info('[EnhancedSelfImprover] 🚀 Deploying with auto-rollback protection...');

    try {
      // Step 1: Capture baseline metrics
      log.info('[EnhancedSelfImprover] 📸 Capturing baseline health metrics...');
      const baseline = await this.rollbackGuard.captureBaseline();

      // Step 2: Perform deployment (call existing deployment logic)
      log.info('[EnhancedSelfImprover] 🚢 Deploying to K8s...');
      await this.performDeployment(proposal);

      // Step 3: Monitor post-deployment health
      log.info('[EnhancedSelfImprover] 🔍 Starting post-deployment monitoring...');
      const monitorResult = await this.rollbackGuard.monitorPostDeploy(baseline, {
        monitoringDuration: options.monitoringDuration || 1800, // 30 min
        autoRollback: options.autoRollback !== false, // default true
        notifyOnDegradation: true
      });

      if (monitorResult.success) {
        log.info('[EnhancedSelfImprover] ✅ Deployment successful and healthy!');
        
        // Mark skill as successful
        if ((proposal as any).savedSkillId) {
          this.skillsLibrary.recordUsage((proposal as any).savedSkillId, true);
        }

        return {
          success: true,
          rolledBack: false,
          metrics: monitorResult.finalMetrics
        };
      } else {
        log.error('[EnhancedSelfImprover] 🔴 Deployment failed health checks');
        
        // Mark skill as failed
        if ((proposal as any).savedSkillId) {
          this.skillsLibrary.recordUsage((proposal as any).savedSkillId, false);
        }

        return {
          success: false,
          rolledBack: monitorResult.rolledBack,
          reason: monitorResult.reason,
          metrics: monitorResult.finalMetrics
        };
      }

    } catch (error: any) {
      log.error('[EnhancedSelfImprover] ❌ Deployment error:', error.message);
      
      // Mark skill as failed
      if ((proposal as any).savedSkillId) {
        this.skillsLibrary.recordUsage((proposal as any).savedSkillId, false);
      }

      return {
        success: false,
        rolledBack: false,
        reason: error.message
      };
    }
  }

  /**
   * Save successful implementation as a skill for future reuse
   */
  private async saveAsSkill(proposal: ImprovementProposal): Promise<void> {
    log.info('[EnhancedSelfImprover] 📚 Saving implementation as skill...');

    try {
      // Extract code from files
      const fs = require('fs');
      let code = '';
      for (const file of proposal.files) {
        if (fs.existsSync(file)) {
          code += `// ${file}\n${fs.readFileSync(file, 'utf-8')}\n\n`;
        }
      }

      // Determine category from type
      const categoryMap: Record<string, string> = {
        'feature': 'feature',
        'bugfix': 'bugfix',
        'optimization': 'optimization',
        'refactor': 'refactor',
        'documentation': 'docs',
        'test': 'testing'
      };
      const category = categoryMap[proposal.type] || 'other';

      // Extract language from first file
      const firstFile = proposal.files[0] || '';
      const language = firstFile.endsWith('.ts') ? 'typescript' 
        : firstFile.endsWith('.py') ? 'python'
        : firstFile.endsWith('.sh') ? 'bash'
        : 'other';

      // Generate tags from title and description
      const tags = [
        proposal.type,
        ...proposal.files.map(f => f.split('/')[1] || 'core'), // e.g., 'src/llm' -> 'llm'
        proposal.risk
      ].filter(Boolean);

      const skill: Omit<Skill, 'id' | 'usageCount' | 'successCount' | 'failureCount' | 'successRate' | 'createdAt'> = {
        name: proposal.title,
        description: `${proposal.description}\n\nReasoning: ${proposal.reasoning}`,
        code,
        language,
        category,
        tags: Array.from(new Set(tags)) // dedupe
      };

      const skillId = await this.skillsLibrary.addSkill(skill);
      (proposal as any).savedSkillId = skillId;

      log.info(`[EnhancedSelfImprover] ✅ Skill saved with ID: ${skillId}`);
    } catch (error: any) {
      log.error('[EnhancedSelfImprover] ⚠️ Failed to save skill:', error.message);
      // Don't throw - saving skill is optional
    }
  }

  /**
   * Perform actual K8s deployment
   * TODO: Implement real deployment logic
   */
  private async performDeployment(proposal: ImprovementProposal): Promise<void> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    log.info('[EnhancedSelfImprover] 🚢 Deploying to K8s...');

    try {
      // 1. Build Docker image
      log.info('[EnhancedSelfImprover] 🐳 Building Docker image...');
      const imageTag = `gcr.io/opencellcw-k8s/ulf-warden-agent:${proposal.id.substring(0, 8)}`;
      
      await execAsync(`gcloud builds submit --tag ${imageTag} .`);
      log.info(`[EnhancedSelfImprover] ✅ Image built: ${imageTag}`);

      // 2. Update K8s deployment
      log.info('[EnhancedSelfImprover] ☸️ Updating K8s deployment...');
      await execAsync(
        `kubectl set image deployment/ulf-warden-agent ulf-warden-agent=${imageTag} -n agents`
      );

      // 3. Wait for rollout
      log.info('[EnhancedSelfImprover] ⏳ Waiting for rollout...');
      await execAsync(
        `kubectl rollout status deployment/ulf-warden-agent -n agents --timeout=300s`
      );

      log.info('[EnhancedSelfImprover] ✅ Deployment complete');

    } catch (error: any) {
      log.error('[EnhancedSelfImprover] ❌ Deployment failed:', error.message);
      throw error;
    }
  }

  /**
   * Get skills library statistics
   */
  getSkillsStats(): any {
    return this.skillsLibrary.getStats();
  }

  /**
   * Search skills library
   */
  async searchSkills(query: string, limit: number = 5): Promise<any> {
    return await this.skillsLibrary.findSimilar(query, limit);
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<any> {
    return await this.rollbackGuard.getHealthStatus();
  }

  /**
   * Manual rollback trigger
   */
  async triggerRollback(reason: string): Promise<boolean> {
    return await this.rollbackGuard.triggerManualRollback(reason);
  }

  /**
   * Close resources
   */
  close(): void {
    this.skillsLibrary.close();
    log.info('[EnhancedSelfImprover] 👋 Resources closed');
  }
}

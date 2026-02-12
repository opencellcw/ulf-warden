import { log } from '../logger';

/**
 * Quick Actions System
 * 
 * Provides one-click actions based on context.
 * 
 * Example:
 *   Bot: "Found 3 bugs in code"
 *   Actions: [Fix All] [Create Issues] [Ignore]
 *   
 *   Bot: "Deploy ready"
 *   Actions: [Deploy] [View Diff] [Cancel]
 * 
 * = Less typing, better UX! 🚀
 */

export interface QuickAction {
  id: string;
  label: string;
  emoji?: string;
  action: string;
  params?: Record<string, any>;
  style?: 'primary' | 'secondary' | 'success' | 'danger';
  requireConfirmation?: boolean;
}

export interface ActionContext {
  messageContent: string;
  userId: string;
  botId: string;
  channelType: 'dm' | 'channel' | 'group';
  recentActions?: string[];
}

export class QuickActionsSystem {
  /**
   * Suggest actions based on context
   */
  suggestActions(context: ActionContext): QuickAction[] {
    const actions: QuickAction[] = [];
    const content = context.messageContent.toLowerCase();

    // Deploy-related
    if (content.includes('deploy') || content.includes('release')) {
      if (content.includes('ready') || content.includes('success')) {
        actions.push({
          id: 'deploy_now',
          label: 'Deploy Now',
          emoji: '🚀',
          action: 'execute_deploy',
          style: 'success',
          requireConfirmation: true,
        });
        actions.push({
          id: 'view_changes',
          label: 'View Changes',
          emoji: '📋',
          action: 'show_diff',
          style: 'secondary',
        });
      } else if (content.includes('fail') || content.includes('error')) {
        actions.push({
          id: 'rollback',
          label: 'Rollback',
          emoji: '↩️',
          action: 'execute_rollback',
          style: 'danger',
          requireConfirmation: true,
        });
        actions.push({
          id: 'view_logs',
          label: 'View Logs',
          emoji: '📄',
          action: 'show_logs',
          style: 'secondary',
        });
        actions.push({
          id: 'retry',
          label: 'Retry',
          emoji: '🔄',
          action: 'retry_deploy',
          style: 'primary',
        });
      }
    }

    // Bug/Error-related
    if (content.includes('bug') || content.includes('error') || content.includes('issue')) {
      const bugCount = this.extractNumber(content, 'bug') || this.extractNumber(content, 'error');
      
      actions.push({
        id: 'fix_all',
        label: 'Fix All',
        emoji: '🔧',
        action: 'fix_issues',
        params: { count: bugCount },
        style: 'primary',
      });
      actions.push({
        id: 'create_issues',
        label: 'Create Issues',
        emoji: '📝',
        action: 'create_github_issues',
        params: { count: bugCount },
        style: 'secondary',
      });
      actions.push({
        id: 'ignore',
        label: 'Ignore',
        emoji: '👁️',
        action: 'ignore_issues',
        style: 'secondary',
      });
    }

    // Code review
    if (content.includes('review') || content.includes('pr') || content.includes('pull request')) {
      actions.push({
        id: 'approve',
        label: 'Approve',
        emoji: '✅',
        action: 'approve_pr',
        style: 'success',
      });
      actions.push({
        id: 'request_changes',
        label: 'Request Changes',
        emoji: '🔄',
        action: 'request_changes',
        style: 'secondary',
      });
      actions.push({
        id: 'view_diff',
        label: 'View Diff',
        emoji: '📊',
        action: 'show_diff',
        style: 'secondary',
      });
    }

    // Testing
    if (content.includes('test') && !content.includes('tested')) {
      actions.push({
        id: 'run_tests',
        label: 'Run Tests',
        emoji: '🧪',
        action: 'execute_tests',
        style: 'primary',
      });
      actions.push({
        id: 'run_all_tests',
        label: 'Run All Tests',
        emoji: '🔬',
        action: 'execute_all_tests',
        style: 'secondary',
      });
    }

    // Documentation
    if (content.includes('document') || content.includes('readme')) {
      actions.push({
        id: 'generate_docs',
        label: 'Generate Docs',
        emoji: '📚',
        action: 'generate_documentation',
        style: 'primary',
      });
      actions.push({
        id: 'update_readme',
        label: 'Update README',
        emoji: '📝',
        action: 'update_readme',
        style: 'secondary',
      });
    }

    // Server/Infrastructure
    if (content.includes('server') || content.includes('pod') || content.includes('container')) {
      if (content.includes('down') || content.includes('crash')) {
        actions.push({
          id: 'restart',
          label: 'Restart',
          emoji: '🔄',
          action: 'restart_service',
          style: 'danger',
          requireConfirmation: true,
        });
        actions.push({
          id: 'check_logs',
          label: 'Check Logs',
          emoji: '📄',
          action: 'show_logs',
          style: 'secondary',
        });
      } else if (content.includes('status')) {
        actions.push({
          id: 'detailed_status',
          label: 'Detailed Status',
          emoji: '📊',
          action: 'show_detailed_status',
          style: 'secondary',
        });
        actions.push({
          id: 'refresh',
          label: 'Refresh',
          emoji: '🔄',
          action: 'refresh_status',
          style: 'secondary',
        });
      }
    }

    // Data/Analytics
    if (content.includes('data') || content.includes('analytics') || content.includes('metrics')) {
      actions.push({
        id: 'export_csv',
        label: 'Export CSV',
        emoji: '📊',
        action: 'export_data_csv',
        style: 'secondary',
      });
      actions.push({
        id: 'create_chart',
        label: 'Create Chart',
        emoji: '📈',
        action: 'generate_chart',
        style: 'primary',
      });
      actions.push({
        id: 'analyze',
        label: 'Deep Analysis',
        emoji: '🔍',
        action: 'analyze_data',
        style: 'secondary',
      });
    }

    // Always offer common actions
    if (actions.length > 0) {
      actions.push({
        id: 'explain_more',
        label: 'Explain More',
        emoji: '💬',
        action: 'explain_detail',
        style: 'secondary',
      });
    }

    return actions.slice(0, 5); // Max 5 actions
  }

  /**
   * Execute an action
   */
  async executeAction(
    actionId: string,
    context: ActionContext
  ): Promise<{ success: boolean; message: string }> {
    log.info('[QuickActions] Executing action', {
      actionId,
      userId: context.userId,
    });

    // This is where actual execution would happen
    // For now, return success message
    
    const actionLabels: Record<string, string> = {
      deploy_now: '🚀 Deploying to production...',
      rollback: '↩️ Rolling back deployment...',
      fix_all: '🔧 Fixing all issues...',
      create_issues: '📝 Creating GitHub issues...',
      approve_pr: '✅ Approving pull request...',
      run_tests: '🧪 Running tests...',
      restart: '🔄 Restarting service...',
      export_csv: '📊 Exporting data to CSV...',
      generate_docs: '📚 Generating documentation...',
    };

    const message = actionLabels[actionId] || '⚡ Executing action...';

    return {
      success: true,
      message,
    };
  }

  /**
   * Generate action history for user
   */
  getActionHistory(userId: string, limit: number = 10): QuickAction[] {
    // Would query from database
    // For now, return empty
    return [];
  }

  /**
   * Get most used actions for user
   */
  getMostUsedActions(userId: string, limit: number = 5): QuickAction[] {
    // Would analyze usage patterns
    // For now, return common ones
    return [
      {
        id: 'deploy',
        label: 'Deploy',
        emoji: '🚀',
        action: 'execute_deploy',
        style: 'success',
      },
      {
        id: 'view_logs',
        label: 'View Logs',
        emoji: '📄',
        action: 'show_logs',
        style: 'secondary',
      },
      {
        id: 'run_tests',
        label: 'Run Tests',
        emoji: '🧪',
        action: 'execute_tests',
        style: 'primary',
      },
    ];
  }

  /**
   * Extract number from text (e.g., "3 bugs found" → 3)
   */
  private extractNumber(text: string, keyword: string): number | null {
    const regex = new RegExp(`(\\d+)\\s*${keyword}`, 'i');
    const match = text.match(regex);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Format actions as Discord components
   */
  toDiscordComponents(actions: QuickAction[]): any {
    return {
      type: 1,
      components: actions.map(action => ({
        type: 2,
        style: this.getDiscordStyle(action.style),
        label: action.label,
        emoji: action.emoji ? { name: action.emoji } : undefined,
        custom_id: action.id,
      })),
    };
  }

  /**
   * Get Discord button style
   */
  private getDiscordStyle(style?: string): number {
    const styles: Record<string, number> = {
      primary: 1,
      secondary: 2,
      success: 3,
      danger: 4,
    };
    return styles[style || 'secondary'] || 2;
  }
}

// Singleton
let actionsInstance: QuickActionsSystem | null = null;

export function getQuickActions(): QuickActionsSystem {
  if (!actionsInstance) {
    actionsInstance = new QuickActionsSystem();
  }
  return actionsInstance;
}

export const quickActions = getQuickActions();

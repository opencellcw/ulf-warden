import { executeShell, writeFile, readFile, listDirectory, getProcessInfo } from './executor';
import { TOOLS } from './definitions';
import { executeGitHubTool } from './github';
import { executeWebTool } from './web';
import { executeFileTool } from './files';
import { executeProcessTool } from './process';
import { executeReplicateTool } from './replicate';
import { executeElevenLabsTool } from './elevenlabs';
import { executeOpenAITool } from './openai-tools';
import { executeBraveSearchTool } from './brave-search';
import { executePlaywrightTool } from './playwright';
import { executeMemoryTool } from './memory-search';
import { sendSlackMessage } from './slack-messaging';
import { executeVideoCloneTool } from './video-clone-tool';
import { scheduleTask, listScheduledTasks, cancelScheduledTask } from './scheduler';
import {
  proposeSelfImprovement,
  listPendingImprovements,
  getImprovementStats
} from './self-improvement';
import { executeBotFactoryTool } from '../bot-factory/executor';
import { executeRepoSecurityTool } from './repo-security';
import { executeEmailTool } from './email';
import { executeCryptoPriceTool } from './crypto-prices';
import { log } from '../logger';
import { persistence } from '../persistence';
import { vetToolCall, isInDenylist, validateToolArgs } from '../security/vetter';
import { executeToolSecurely } from '../security/tool-executor';
import { isToolBlocked, getToolSecurityInfo } from '../config/blocked-tools';
import { trustManager } from '../identity/trust-manager';
import { activityTracker } from '../activity/activity-tracker';

export { TOOLS };

export async function executeTool(
  toolName: string,
  toolInput: any,
  userId?: string,
  userRequest?: string,
  trustLevel?: string
): Promise<string> {
  const startTime = Date.now();

  try {
    // 🔓 OWNER BYPASS: Owners skip all security checks
    if (trustLevel === 'owner') {
      log.info('[Security] Owner bypass - all checks skipped', { toolName, userId });
      // Skip all security layers for owners
    } else {
      // 🔒 SECURITY LAYER 1: Check blocklist (OpenClaw-Security inspired)
      const securityInfo = getToolSecurityInfo(toolName);
      if (securityInfo.blocked) {
        log.warn('[BlockedTools] Tool execution blocked', {
          toolName,
          userId,
          reason: securityInfo.reason
        });
        activityTracker.emitSecurity(toolName, securityInfo.reason || 'Blocked by security policy', userId);
        return `🚫 Tool "${toolName}" is blocked by security policy.\nReason: ${securityInfo.reason}`;
      }

      // 🔒 SECURITY LAYER 2: Auto-block denylist tools (legacy)
      if (isInDenylist(toolName)) {
        log.warn('[Vetter] Tool is in denylist', { toolName, userId });
        return `🚫 Tool "${toolName}" is blocked by security policy`;
      }

      // 🔒 SECURITY: Validate tool arguments for injection patterns
      const argsValidation = validateToolArgs(toolName, toolInput);
      if (!argsValidation.valid) {
        log.warn('[Vetter] Invalid tool arguments', {
          toolName,
          userId,
          reason: argsValidation.reason
        });
        return `🚫 Tool arguments rejected: ${argsValidation.reason}`;
      }
    }

    // 🔒 SECURITY: Vet high-risk tools before execution (unless owner)
    const highRiskTools = [
      'execute_shell',
      'write_file',
      'delete_bot',
      'create_bot',
      'send_slack_message',
      'schedule_task'
    ];

    if (highRiskTools.includes(toolName) && trustLevel !== 'owner') {
      try {
        const vetDecision = await vetToolCall(
          toolName,
          toolInput,
          userRequest || 'Unknown request',
          true, // Use Haiku for speed
          trustLevel
        );

        if (!vetDecision.allowed) {
          log.warn('[Vetter] Tool call BLOCKED', {
            toolName,
            userId,
            reason: vetDecision.reason
          });
          activityTracker.emitSecurity(toolName, vetDecision.reason || 'Blocked by vetter', userId);

          // Record blocked interaction (penalizes trust score)
          if (userId) {
            const discordId = userId.replace('discord_', '');
            await trustManager.recordInteraction(discordId, 'discord', {
              wasBlocked: true,
              toolUsed: toolName
            });
          }

          return `🚫 Tool blocked by security vetter: ${vetDecision.reason}`;
        }

        log.info('[Vetter] Tool call PERMITTED', {
          toolName,
          userId,
          riskLevel: vetDecision.riskLevel
        });

        // Record permitted tool use (positive for trust)
        if (userId) {
          const discordId = userId.replace('discord_', '');
          await trustManager.recordInteraction(discordId, 'discord', {
            wasBlocked: false,
            toolUsed: toolName
          });
        }
      } catch (error: any) {
        log.error('[Vetter] Vetting failed, blocking for safety', { toolName, error: error.message });
        return `🚫 Tool blocked: Security vetting failed`;
      }
    }

    // Emit activity tracking for high-risk tools
    if (highRiskTools.includes(toolName)) {
      const inputPreview = typeof toolInput === 'string' ? toolInput : JSON.stringify(toolInput).substring(0, 300);
      activityTracker.emitToolUse(toolName, inputPreview);
    }

    // Log tool execution start
    if (userId) {
      await persistence.logToolExecution({
        userId,
        toolName,
        input: JSON.stringify(toolInput),
        output: null,
        timestamp: new Date().toISOString(),
        status: 'running'
      });
    }

    // 🔒 SECURITY LAYER 4: Execute with timeout and concurrency control
    const result = await executeToolSecurely(
      toolName,
      userId || 'unknown',
      async () => {
        return await executeToolInternal(toolName, toolInput, userId);
      },
      trustLevel
    );

    const duration = Date.now() - startTime;
    log.tool('executed', toolName, userId || 'unknown', { duration, success: true });

    // Log successful execution
    if (userId) {
      await persistence.logToolExecution({
        userId,
        toolName,
        input: JSON.stringify(toolInput),
        output: result.substring(0, 1000), // Truncate long outputs
        timestamp: new Date().toISOString(),
        status: 'success'
      });
    }

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.error(`Tool execution failed: ${toolName}`, { error, duration });

    // Log failed execution
    if (userId) {
      await persistence.logToolExecution({
        userId,
        toolName,
        input: JSON.stringify(toolInput),
        output: null,
        timestamp: new Date().toISOString(),
        status: 'error',
        errorMessage: error.message
      });
    }

    return `Error: ${error.message}`;
  }
}

/**
 * Internal tool execution (wrapped by executeToolSecurely)
 */
async function executeToolInternal(toolName: string, toolInput: any, userId?: string): Promise<string> {
  let result: string;

  // Base tools
  switch (toolName) {
      case 'execute_shell':
        result = await executeShell(toolInput.command);
        break;

      case 'write_file':
        result = await writeFile(toolInput.path, toolInput.content);
        break;

      case 'read_file':
        result = await readFile(toolInput.path);
        break;

      case 'list_directory':
        result = await listDirectory(toolInput.path || '.');
        break;

      case 'get_processes':
        result = await getProcessInfo();
        break;

      // Slack messaging tool
      case 'send_slack_message':
        result = await sendSlackMessage(toolInput);
        break;

      // Email tool
      case 'send_email':
        result = await executeEmailTool(toolInput);
        break;

      // Crypto price tool
      case 'get_crypto_price':
        result = await executeCryptoPriceTool(toolName, toolInput);
        break;

      // Scheduler tools
      case 'schedule_task':
        result = await scheduleTask(toolInput, userId);
        break;

      case 'list_scheduled_tasks':
        result = await listScheduledTasks(toolInput, userId);
        break;

      case 'cancel_scheduled_task':
        result = await cancelScheduledTask(toolInput);
        break;

      // Self-improvement tools
      case 'propose_self_improvement':
        result = await proposeSelfImprovement(toolInput);
        break;

      case 'list_pending_improvements':
        result = await listPendingImprovements(toolInput);
        break;

      case 'get_improvement_stats':
        result = await getImprovementStats(toolInput);
        break;

      // Bot factory tools
      case 'create_bot':
      case 'list_bots':
      case 'delete_bot':
      case 'get_bot_status':
        result = await executeBotFactoryTool(toolName, toolInput, userId || 'unknown');
        break;

      // Repo security tools
      case 'secure_repo':
      case 'scan_repo_secrets':
        result = await executeRepoSecurityTool(toolName, toolInput);
        break;

      // GitHub tools
      case 'github_clone':
      case 'github_search':
      case 'github_issue':
      case 'github_pr':
        result = await executeGitHubTool(toolName, toolInput);
        break;

      // Web tools
      case 'web_fetch':
      case 'web_extract':
        result = await executeWebTool(toolName, toolInput);
        break;

      // File tools
      case 'file_search':
      case 'file_diff':
      case 'file_backup':
        result = await executeFileTool(toolName, toolInput);
        break;

      // Process tools
      case 'process_start':
      case 'process_list':
      case 'process_stop':
      case 'process_restart':
      case 'process_logs':
        result = await executeProcessTool(toolName, toolInput);
        break;

      // Replicate tools
      case 'replicate_generate_image':
      case 'replicate_generate_video':
      case 'replicate_run_model':
      case 'replicate_upscale_image':
      case 'replicate_remove_background':
        result = await executeReplicateTool(toolName, toolInput, userId);
        break;

      // Replicate Registry tools
      case 'search_replicate_models':
        const { searchReplicateModels } = await import('./replicate-registry');
        result = await searchReplicateModels(toolInput);
        break;
      
      case 'get_replicate_model_info':
        const { getReplicateModelInfo } = await import('./replicate-registry');
        result = await getReplicateModelInfo(toolInput);
        break;
      
      case 'list_top_replicate_models':
        const { listTopReplicateModels } = await import('./replicate-registry');
        result = await listTopReplicateModels(toolInput);
        break;
      
      case 'sync_replicate_models':
        const { syncReplicateModelsNow } = await import('./replicate-registry');
        result = await syncReplicateModelsNow();
        break;

      // ElevenLabs tools
      case 'elevenlabs_text_to_speech':
      case 'elevenlabs_list_voices':
      case 'elevenlabs_get_voice_info':
        result = await executeElevenLabsTool(toolName, toolInput);
        break;

      // OpenAI tools
      case 'openai_generate_image':
      case 'openai_gpt_chat':
      case 'openai_transcribe_audio':
      case 'openai_analyze_image':
        result = await executeOpenAITool(toolName, toolInput);
        break;

      // Brave Search tools
      case 'brave_web_search':
      case 'brave_news_search':
        result = await executeBraveSearchTool(toolName, toolInput);
        break;

      // YouTube Video Clone
      case 'youtube_video_clone':
        result = await executeVideoCloneTool(toolInput);
        break;

      // Playwright browser tools
      case 'browser_navigate':
      case 'browser_screenshot':
      case 'browser_get_content':
      case 'browser_click':
      case 'browser_fill_form':
      case 'browser_execute_js':
      case 'browser_wait_for':
      case 'browser_close':
        result = await executePlaywrightTool(toolName, toolInput);
        break;

      // Memory tools
      case 'memory_search':
      case 'memory_recall':
        result = await executeMemoryTool(toolName, toolInput);
        break;

      // Web hosting tool
      case 'deploy_public_app':
        const { webHost } = await import('./web-host');
        const deployResult = await webHost.deployStaticSite(toolInput);
        result = deployResult.success
          ? `✅ App deployed!\n\n🌐 URL: ${deployResult.url}\n📛 Name: ${deployResult.name}\n⏰ Expires: ${deployResult.expiresAt}\n\nYour app is live and accessible at the URL above!`
          : `❌ Deployment failed: ${deployResult.error}`;
        break;

      case 'list_public_apps':
        const { webHost: webHostList } = await import('./web-host');
        const apps = await webHostList.listApps();
        result = apps.length > 0
          ? `📋 Active apps:\n${apps.map(app => `• ${app}`).join('\n')}`
          : 'No apps currently deployed';
        break;

      case 'delete_public_app':
        const { webHost: webHostDelete } = await import('./web-host');
        await webHostDelete.deleteApp(toolInput.name);
        result = `✅ App "${toolInput.name}" deleted successfully`;
        break;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return result;
}

import { executeShell, writeFile, readFile, listDirectory, getProcessInfo } from './executor';
import { TOOLS } from './definitions';
import { executeGitHubTool } from './github';
import { executeWebTool } from './web';
import { executeFileTool } from './files';
import { executeProcessTool } from './process';
import { executeReplicateTool } from './replicate';
import { executeElevenLabsTool } from './elevenlabs';
import { executeOpenAITool } from './openai-tools';
import { sendSlackMessage } from './slack-messaging';
import { scheduleTask, listScheduledTasks, cancelScheduledTask } from './scheduler';
import {
  proposeSelfImprovement,
  listPendingImprovements,
  getImprovementStats
} from './self-improvement';
import { executeBotFactoryTool } from '../bot-factory/executor';
import { log } from '../logger';
import { persistence } from '../persistence';
import { vetToolCall, isInDenylist, validateToolArgs } from '../security/vetter';

export { TOOLS };

export async function executeTool(toolName: string, toolInput: any, userId?: string, userRequest?: string): Promise<string> {
  const startTime = Date.now();

  try {
    // 🔒 SECURITY: Auto-block denylist tools
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

    // 🔒 SECURITY: Vet high-risk tools before execution
    const highRiskTools = [
      'execute_shell',
      'write_file',
      'delete_bot',
      'create_bot',
      'send_slack_message',
      'schedule_task'
    ];

    if (highRiskTools.includes(toolName)) {
      try {
        const vetDecision = await vetToolCall(
          toolName,
          toolInput,
          userRequest || 'Unknown request',
          true // Use Haiku for speed
        );

        if (!vetDecision.allowed) {
          log.warn('[Vetter] Tool call BLOCKED', {
            toolName,
            userId,
            reason: vetDecision.reason
          });
          return `🚫 Tool blocked by security vetter: ${vetDecision.reason}`;
        }

        log.info('[Vetter] Tool call PERMITTED', {
          toolName,
          userId,
          riskLevel: vetDecision.riskLevel
        });
      } catch (error: any) {
        log.error('[Vetter] Vetting failed, blocking for safety', { toolName, error: error.message });
        return `🚫 Tool blocked: Security vetting failed`;
      }
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
        result = await executeReplicateTool(toolName, toolInput);
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

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

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

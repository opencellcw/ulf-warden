"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOLS = void 0;
exports.executeTool = executeTool;
const executor_1 = require("./executor");
const definitions_1 = require("./definitions");
Object.defineProperty(exports, "TOOLS", { enumerable: true, get: function () { return definitions_1.TOOLS; } });
const github_1 = require("./github");
const web_1 = require("./web");
const files_1 = require("./files");
const process_1 = require("./process");
const replicate_1 = require("./replicate");
const elevenlabs_1 = require("./elevenlabs");
const openai_tools_1 = require("./openai-tools");
const slack_messaging_1 = require("./slack-messaging");
const scheduler_1 = require("./scheduler");
const self_improvement_1 = require("./self-improvement");
const logger_1 = require("../logger");
const persistence_1 = require("../persistence");
async function executeTool(toolName, toolInput, userId) {
    const startTime = Date.now();
    try {
        // Log tool execution start
        if (userId) {
            await persistence_1.persistence.logToolExecution({
                userId,
                toolName,
                input: JSON.stringify(toolInput),
                output: null,
                timestamp: new Date().toISOString(),
                status: 'running'
            });
        }
        let result;
        // Base tools
        switch (toolName) {
            case 'execute_shell':
                result = await (0, executor_1.executeShell)(toolInput.command);
                break;
            case 'write_file':
                result = await (0, executor_1.writeFile)(toolInput.path, toolInput.content);
                break;
            case 'read_file':
                result = await (0, executor_1.readFile)(toolInput.path);
                break;
            case 'list_directory':
                result = await (0, executor_1.listDirectory)(toolInput.path || '.');
                break;
            case 'get_processes':
                result = await (0, executor_1.getProcessInfo)();
                break;
            // Slack messaging tool
            case 'send_slack_message':
                result = await (0, slack_messaging_1.sendSlackMessage)(toolInput);
                break;
            // Scheduler tools
            case 'schedule_task':
                result = await (0, scheduler_1.scheduleTask)(toolInput, userId);
                break;
            case 'list_scheduled_tasks':
                result = await (0, scheduler_1.listScheduledTasks)(toolInput, userId);
                break;
            case 'cancel_scheduled_task':
                result = await (0, scheduler_1.cancelScheduledTask)(toolInput);
                break;
            // Self-improvement tools
            case 'propose_self_improvement':
                result = await (0, self_improvement_1.proposeSelfImprovement)(toolInput);
                break;
            case 'list_pending_improvements':
                result = await (0, self_improvement_1.listPendingImprovements)(toolInput);
                break;
            case 'get_improvement_stats':
                result = await (0, self_improvement_1.getImprovementStats)(toolInput);
                break;
            // GitHub tools
            case 'github_clone':
            case 'github_search':
            case 'github_issue':
            case 'github_pr':
                result = await (0, github_1.executeGitHubTool)(toolName, toolInput);
                break;
            // Web tools
            case 'web_fetch':
            case 'web_extract':
                result = await (0, web_1.executeWebTool)(toolName, toolInput);
                break;
            // File tools
            case 'file_search':
            case 'file_diff':
            case 'file_backup':
                result = await (0, files_1.executeFileTool)(toolName, toolInput);
                break;
            // Process tools
            case 'process_start':
            case 'process_list':
            case 'process_stop':
            case 'process_restart':
            case 'process_logs':
                result = await (0, process_1.executeProcessTool)(toolName, toolInput);
                break;
            // Replicate tools
            case 'replicate_generate_image':
            case 'replicate_generate_video':
            case 'replicate_run_model':
            case 'replicate_upscale_image':
            case 'replicate_remove_background':
                result = await (0, replicate_1.executeReplicateTool)(toolName, toolInput);
                break;
            // ElevenLabs tools
            case 'elevenlabs_text_to_speech':
            case 'elevenlabs_list_voices':
            case 'elevenlabs_get_voice_info':
                result = await (0, elevenlabs_1.executeElevenLabsTool)(toolName, toolInput);
                break;
            // OpenAI tools
            case 'openai_generate_image':
            case 'openai_gpt_chat':
            case 'openai_transcribe_audio':
            case 'openai_analyze_image':
                result = await (0, openai_tools_1.executeOpenAITool)(toolName, toolInput);
                break;
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
        const duration = Date.now() - startTime;
        logger_1.log.tool('executed', toolName, userId || 'unknown', { duration, success: true });
        // Log successful execution
        if (userId) {
            await persistence_1.persistence.logToolExecution({
                userId,
                toolName,
                input: JSON.stringify(toolInput),
                output: result.substring(0, 1000), // Truncate long outputs
                timestamp: new Date().toISOString(),
                status: 'success'
            });
        }
        return result;
    }
    catch (error) {
        const duration = Date.now() - startTime;
        logger_1.log.error(`Tool execution failed: ${toolName}`, { error, duration });
        // Log failed execution
        if (userId) {
            await persistence_1.persistence.logToolExecution({
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

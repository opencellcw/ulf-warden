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

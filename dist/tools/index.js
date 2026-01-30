"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOLS = void 0;
exports.executeTool = executeTool;
const executor_1 = require("./executor");
const definitions_1 = require("./definitions");
Object.defineProperty(exports, "TOOLS", { enumerable: true, get: function () { return definitions_1.TOOLS; } });
async function executeTool(toolName, toolInput) {
    try {
        switch (toolName) {
            case 'execute_shell':
                return await (0, executor_1.executeShell)(toolInput.command);
            case 'write_file':
                return await (0, executor_1.writeFile)(toolInput.path, toolInput.content);
            case 'read_file':
                return await (0, executor_1.readFile)(toolInput.path);
            case 'list_directory':
                return await (0, executor_1.listDirectory)(toolInput.path || '.');
            case 'get_processes':
                return await (0, executor_1.getProcessInfo)();
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    catch (error) {
        console.error(`[Tools] Error executing ${toolName}:`, error);
        return `Error: ${error.message}`;
    }
}

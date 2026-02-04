"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolHandler = void 0;
const zod_1 = require("zod");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Input schema
const ExecuteShellInputSchema = zod_1.z.object({
    command: zod_1.z.string().min(1, 'Command is required'),
    timeout: zod_1.z.number().optional().default(30000),
    cwd: zod_1.z.string().optional()
});
const COMMAND_TIMEOUT = 30000; // 30s
const MAX_OUTPUT_LENGTH = 4000; // chars
/**
 * Mask sensitive data in output
 */
function maskSecrets(text) {
    return text
        .replace(/sk-ant-[a-zA-Z0-9_-]+/g, 'sk-ant-***MASKED***')
        .replace(/xoxb-[0-9]+-[0-9]+-[a-zA-Z0-9]+/g, 'xoxb-***MASKED***')
        .replace(/xapp-[0-9]+-[A-Z0-9]+-[0-9]+-[a-f0-9]+/g, 'xapp-***MASKED***')
        .replace(/(password|token|secret|key)[\s=:]+[^\s\n]+/gi, '$1=***MASKED***');
}
/**
 * Truncate long output
 */
function truncateOutput(text, maxLength = MAX_OUTPUT_LENGTH) {
    if (text.length <= maxLength)
        return text;
    const half = Math.floor(maxLength / 2);
    return text.slice(0, half) + '\n\n... [OUTPUT TRUNCATED] ...\n\n' + text.slice(-half);
}
/**
 * Execute shell command implementation
 */
async function executeShellHandler(input, context) {
    try {
        console.log(`[ExecuteShell] Running: ${input.command}`);
        const { stdout, stderr } = await execAsync(input.command, {
            timeout: input.timeout || COMMAND_TIMEOUT,
            maxBuffer: 10 * 1024 * 1024, // 10MB
            cwd: input.cwd
        });
        const output = stdout + (stderr ? `\nSTDERR:\n${stderr}` : '');
        const masked = maskSecrets(output);
        const truncated = truncateOutput(masked);
        console.log(`[ExecuteShell] Success: ${input.command.substring(0, 50)}...`);
        return truncated || '[Command executed successfully - no output]';
    }
    catch (error) {
        console.error(`[ExecuteShell] Error: ${error.message}`);
        if (error.killed) {
            throw new Error(`Command timeout after ${input.timeout || COMMAND_TIMEOUT}ms`);
        }
        const errorMsg = error.message || error.stderr || 'Command failed';
        throw new Error(maskSecrets(errorMsg));
    }
}
// Export tool handler for auto-discovery
exports.toolHandler = {
    metadata: {
        name: 'execute_shell',
        description: 'Execute a shell command and return the output. Use this for running system commands, npm/pip commands, git operations, etc. Command output is truncated if too long.',
        category: 'system',
        inputSchema: ExecuteShellInputSchema,
        tags: ['shell', 'command', 'system', 'dangerous'],
        enabled: true,
        security: {
            idempotent: false, // Commands may have side effects
            requiresApproval: true, // High risk - requires vetting
            riskLevel: 'high'
        },
        examples: [
            {
                input: { command: 'ls -la' },
                output: 'total 64\ndrwxr-xr-x  10 user  staff   320 Jan  1 12:00 .\n...'
            },
            {
                input: { command: 'npm install express', timeout: 60000 },
                output: 'added 50 packages in 5.2s'
            }
        ]
    },
    execute: executeShellHandler
};

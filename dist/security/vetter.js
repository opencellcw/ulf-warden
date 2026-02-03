"use strict";
/**
 * Tool Vetter - Layer 2 Defense
 *
 * Security gate for tool execution.
 * Validates all tool calls before they execute.
 *
 * Pattern: Tool call → Vetter → PERMIT/BLOCK → Execute/Reject
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.vetToolCall = vetToolCall;
exports.isInAllowlist = isInAllowlist;
exports.isInDenylist = isInDenylist;
exports.validateToolArgs = validateToolArgs;
exports.formatConfirmationPrompt = formatConfirmationPrompt;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const logger_1 = require("../logger");
const VETTER_PROMPT = `You are a strict security gate for an AI agent.

You will be given:
- The user's request
- The tool name and arguments the agent wants to run

Decide if the tool call should be allowed.

Rules:
- Reply ONLY with:
  - PERMIT
  - or BLOCK: <short reason>

- Block if the action is:
  - unrelated to the user request
  - destructive or irreversible without explicit confirmation
  - involving credentials / secrets / tokens
  - sending messages/emails to unspecified recipients
  - editing/deleting files outside a clearly allowed workspace
  - running shell commands that modify system state without approval

- If unsure, BLOCK

CRITICAL: Your response must start with either "PERMIT" or "BLOCK:".
Do not explain, justify, or elaborate unless blocking.`;
/**
 * Risk levels for different tool categories
 */
const TOOL_RISK_LEVELS = {
    // Low risk - read-only
    'web_search': 'low',
    'web_fetch': 'low',
    'read_file': 'low',
    'list_files': 'low',
    'get_status': 'low',
    // Medium risk - can modify state
    'write_file': 'medium',
    'create_file': 'medium',
    'send_message': 'medium',
    // High risk - destructive
    'delete_file': 'high',
    'execute_shell': 'high',
    'deploy': 'high',
    // Critical risk - system-level
    'modify_secrets': 'critical',
    'change_permissions': 'critical',
    'elevate_privileges': 'critical'
};
/**
 * Tools that ALWAYS require user confirmation
 */
const CONFIRMATION_REQUIRED_TOOLS = [
    'delete_file',
    'execute_shell',
    'send_message',
    'send_email',
    'deploy',
    'modify_secrets',
    'git_push',
    'create_pr'
];
/**
 * Vet a tool call before execution
 */
async function vetToolCall(toolName, toolArgs, userRequest, useHaiku = true) {
    const startTime = Date.now();
    const riskLevel = TOOL_RISK_LEVELS[toolName] || 'medium';
    const requiresConfirmation = CONFIRMATION_REQUIRED_TOOLS.includes(toolName);
    // Auto-permit low-risk read-only tools (fail-open for safety)
    if (riskLevel === 'low' && !requiresConfirmation) {
        logger_1.log.info('[Vetter] Auto-permit low-risk tool', { toolName });
        return {
            allowed: true,
            toolName,
            riskLevel,
            requiresConfirmation: false,
            vettedAt: new Date()
        };
    }
    try {
        logger_1.log.info('[Vetter] Vetting tool call', {
            toolName,
            riskLevel,
            requiresConfirmation
        });
        const claude = new sdk_1.default({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
        const model = useHaiku
            ? 'claude-haiku-3-5-20241022'
            : 'claude-sonnet-4-20250514';
        const response = await claude.messages.create({
            model,
            max_tokens: 100,
            temperature: 0, // Deterministic for security
            messages: [
                {
                    role: 'user',
                    content: `User Request:
"${userRequest}"

Proposed Tool Call:
tool="${toolName}"
args=${JSON.stringify(toolArgs, null, 2)}

Answer:`
                }
            ],
            system: VETTER_PROMPT
        });
        const decision = response.content[0].type === 'text'
            ? response.content[0].text.trim()
            : 'BLOCK: Vetter error';
        const allowed = decision.toUpperCase().startsWith('PERMIT');
        const reason = allowed ? undefined : decision.substring(6).trim();
        const duration = Date.now() - startTime;
        const result = {
            allowed,
            reason,
            toolName,
            riskLevel,
            requiresConfirmation,
            vettedAt: new Date()
        };
        logger_1.log.info('[Vetter] Decision made', {
            toolName,
            allowed,
            reason,
            duration: `${duration}ms`,
            requiresConfirmation
        });
        // Log blocks for security audit
        if (!allowed) {
            logger_1.log.warn('[Vetter] Tool call BLOCKED', {
                toolName,
                reason,
                userRequest: userRequest.substring(0, 100),
                args: JSON.stringify(toolArgs)
            });
        }
        return result;
    }
    catch (error) {
        logger_1.log.error('[Vetter] Vetting failed', {
            error: error.message,
            toolName
        });
        // Fail-closed: block on error
        return {
            allowed: false,
            reason: 'Vetting failed - blocked for safety',
            toolName,
            riskLevel,
            requiresConfirmation: true,
            vettedAt: new Date()
        };
    }
}
/**
 * Check if tool is in allowlist (auto-permit)
 */
function isInAllowlist(toolName) {
    const allowlist = [
        'web_search',
        'web_fetch',
        'get_current_time',
        'get_weather'
    ];
    return allowlist.includes(toolName);
}
/**
 * Check if tool is in denylist (auto-block)
 */
function isInDenylist(toolName) {
    const denylist = [
        'format_disk',
        'shutdown_system',
        'delete_all',
        'expose_secrets'
    ];
    return denylist.includes(toolName);
}
/**
 * Validate tool arguments for common injection patterns
 */
function validateToolArgs(toolName, args) {
    // Check for shell injection in execute_shell
    if (toolName === 'execute_shell' && args.command) {
        const dangerous = [
            'rm -rf /',
            'rm -rf ~',
            ':(){:|:&};:',
            'dd if=/dev/random',
            'mkfs',
            'wget | sh',
            'curl | bash'
        ];
        for (const pattern of dangerous) {
            if (args.command.includes(pattern)) {
                return {
                    valid: false,
                    reason: `Dangerous shell pattern detected: ${pattern}`
                };
            }
        }
    }
    // Check for path traversal
    if (args.file_path || args.path) {
        const path = args.file_path || args.path;
        if (path.includes('../') || path.includes('..\\')) {
            return {
                valid: false,
                reason: 'Path traversal detected'
            };
        }
    }
    // Check for credential exposure
    const argsStr = JSON.stringify(args).toLowerCase();
    if (argsStr.includes('password') ||
        argsStr.includes('api_key') ||
        argsStr.includes('secret') ||
        argsStr.includes('token')) {
        return {
            valid: false,
            reason: 'Potential credential in arguments'
        };
    }
    return { valid: true };
}
/**
 * Format vetter decision for user confirmation
 */
function formatConfirmationPrompt(toolName, args, decision) {
    let prompt = `⚠️ **Confirmation Required**\n\n`;
    prompt += `Tool: \`${toolName}\`\n`;
    prompt += `Risk Level: ${decision.riskLevel.toUpperCase()}\n\n`;
    prompt += `**Action Details:**\n`;
    prompt += `\`\`\`json\n${JSON.stringify(args, null, 2)}\n\`\`\`\n\n`;
    if (!decision.allowed) {
        prompt += `🚨 **Vetter Recommendation:** BLOCK\n`;
        prompt += `Reason: ${decision.reason}\n\n`;
    }
    prompt += `Proceed? (yes/no)`;
    return prompt;
}

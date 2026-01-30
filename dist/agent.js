"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const workspace_1 = require("./workspace");
const tools_1 = require("./tools");
const client = new sdk_1.default({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
const MODEL = 'claude-sonnet-4-20250514';
const MAX_ITERATIONS = 10; // Prevent infinite loops
async function runAgent(options) {
    const { userId, userMessage, history } = options;
    console.log(`[Agent] Starting for user ${userId}`);
    const systemPrompt = workspace_1.workspace.getSystemPrompt() + `

# EXECUTION CAPABILITIES

You now have access to tools that let you execute commands, read/write files, and manage the system.

When a user asks you to do something (like "sobe uma FastAPI" or "cria uma API REST"), you should:
1. Use the tools to execute the task
2. Show what you're doing as you go
3. Provide the final result with any URLs/endpoints

Be proactive - if user asks to create something, DO IT with the tools available.

IMPORTANT:
- You're running in a Docker container on Render
- Working directory: /app
- Use background processes (&) for servers
- Ports are exposed automatically by Render
- Show clear, actionable results`;
    const messages = [
        ...history,
        {
            role: 'user',
            content: userMessage,
        },
    ];
    let iteration = 0;
    let response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: tools_1.TOOLS,
    });
    // Agent loop - continue while Claude wants to use tools
    while (response.stop_reason === 'tool_use' && iteration < MAX_ITERATIONS) {
        iteration++;
        console.log(`[Agent] Iteration ${iteration}`);
        // Execute all tool calls
        const toolResults = {
            role: 'user',
            content: [],
        };
        for (const block of response.content) {
            if (block.type === 'tool_use') {
                console.log(`[Agent] Executing tool: ${block.name}`);
                const result = await (0, tools_1.executeTool)(block.name, block.input);
                toolResults.content.push({
                    type: 'tool_result',
                    tool_use_id: block.id,
                    content: result,
                });
            }
        }
        // Add assistant response and tool results to messages
        messages.push({
            role: 'assistant',
            content: response.content,
        });
        messages.push(toolResults);
        // Continue conversation with tool results
        response = await client.messages.create({
            model: MODEL,
            max_tokens: 4096,
            system: systemPrompt,
            messages,
            tools: tools_1.TOOLS,
        });
    }
    if (iteration >= MAX_ITERATIONS) {
        console.warn(`[Agent] Max iterations reached for user ${userId}`);
    }
    // Extract final text response
    const finalMessage = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n\n');
    console.log(`[Agent] Completed after ${iteration} iterations`);
    return finalMessage || 'Task completed.';
}

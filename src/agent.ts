import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { workspace } from './workspace';
import { TOOLS, executeTool } from './tools';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';
const MAX_ITERATIONS = 10; // Prevent infinite loops

export interface AgentOptions {
  userId: string;
  userMessage: string;
  history: MessageParam[];
}

export async function runAgent(options: AgentOptions): Promise<string> {
  const { userId, userMessage, history } = options;

  console.log(`[Agent] Starting for user ${userId}`);

  const systemPrompt = workspace.getSystemPrompt() + `

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

  const messages: MessageParam[] = [
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
    tools: TOOLS,
  });

  // Agent loop - continue while Claude wants to use tools
  while (response.stop_reason === 'tool_use' && iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`[Agent] Iteration ${iteration}`);

    // Execute all tool calls
    const toolResults: Anthropic.MessageParam = {
      role: 'user',
      content: [],
    };

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        console.log(`[Agent] Executing tool: ${block.name}`);

        const result = await executeTool(block.name, block.input);

        (toolResults.content as any[]).push({
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
      tools: TOOLS,
    });
  }

  if (iteration >= MAX_ITERATIONS) {
    console.warn(`[Agent] Max iterations reached for user ${userId}`);
  }

  // Extract final text response
  const finalMessage = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as any).text)
    .join('\n\n');

  console.log(`[Agent] Completed after ${iteration} iterations`);

  return finalMessage || 'Task completed.';
}

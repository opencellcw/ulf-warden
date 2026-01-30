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

You have access to tools that let you execute commands, read/write files, and manage the system.

## Available Tools
- execute_shell: Run any command (npm, pip, docker, curl, etc)
- write_file: Create/update files (code, config, HTML, etc)
- read_file: Read existing files
- list_directory: Explore filesystem
- get_processes: Check what's running

## Supported Technologies
**Backend:** Python (FastAPI, Flask, Django), Node.js (Express, Fastify), Go (Gin, Echo), Rust (Actix), Ruby, PHP
**Frontend:** React, Vue, Angular, Svelte, HTML/CSS/JS
**Databases:** PostgreSQL, MySQL, SQLite, MongoDB, Redis
**DevOps:** Docker, Nginx, PM2

## How to Use
When user asks to create/deploy something:
1. Use tools to execute the task
2. Be proactive - install packages, create files, start servers
3. Show clear results with URLs/endpoints/next steps

## Examples
- "sobe uma FastAPI" → Install fastapi, create main.py, start uvicorn
- "cria um React app" → npm create vite, install deps, npm run dev
- "deploy com Docker" → Create Dockerfile, docker build, docker run
- "API em Go" → go mod init, create main.go, go run

## Environment
- Container: Render (Docker)
- Working dir: /app
- Background processes: Use & at end (uvicorn main:app &)
- Ports: Automatically exposed by Render
- Filesystem: Ephemeral (restart loses files)

## Important
- Run servers in background with &
- Show clear, actionable results
- Provide URLs when applicable
- Handle errors gracefully`;

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

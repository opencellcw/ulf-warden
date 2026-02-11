import Anthropic from '@anthropic-ai/sdk';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { workspace } from './workspace';
import { TOOLS, executeTool } from './tools';
import { getRouter } from './llm';
import { log } from './logger';
import { OutputParser, AgentResponse } from './core/output-parser';
import { featureFlags, Feature } from './core/feature-flags';
import { telemetry } from './core/telemetry';
import { SpanKind } from '@opentelemetry/api';
import { initializeContextCompactor, checkAndCompactContext } from './core/context-compactor';

// Agent always uses Claude API because tools require advanced capabilities
// Local models don't support function calling yet
const router = getRouter();
const claudeProvider = router.getClaudeProvider() as any;
const client = claudeProvider.getClient();

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
const MAX_ITERATIONS = 30; // Prevent infinite loops

// Initialize context compactor (30k reserve for response + tools)
initializeContextCompactor(client, {
  modelMaxTokens: 200_000, // Claude Sonnet 4
  reservedTokens: 30_000, // Reserve for response + tools
  compactionThreshold: 150_000, // Trigger at 150k (88% usage)
  recentMessagesToKeep: 10 // Keep last 10 messages
});

export interface AgentOptions {
  userId: string;
  userMessage: string;
  history: MessageParam[];
  trustLevel?: string;
}

export async function runAgent(options: AgentOptions): Promise<string> {
  const { userId, userMessage, history, trustLevel } = options;

  return telemetry.trace(
    'agent.run',
    async (span) => {
      span?.setAttribute('user.id', userId);
      span?.setAttribute('message.length', userMessage.length);
      span?.setAttribute('history.length', history.length);

      // Log available media tools
      const hasReplicate = !!process.env.REPLICATE_API_TOKEN;
      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;

      log.info('[Agent] Starting agent with tool support', {
        userId,
        mediaTools: {
          replicate: hasReplicate,
          openai: hasOpenAI,
          elevenlabs: hasElevenLabs
        }
      });

      return runAgentInternal(options, span);
    },
    { userId, messageLength: userMessage.length },
    SpanKind.SERVER
  );
}

async function runAgentInternal(options: AgentOptions, parentSpan: any): Promise<string> {
  const { userId, userMessage, history, trustLevel } = options;

  const systemPrompt = workspace.getSystemPrompt() + `

# EXECUTION CAPABILITIES

You have access to tools that let you execute commands, read/write files, and manage the system.

## Available Tools

### System Tools
- execute_shell: Run any command (npm, pip, docker, curl, etc)
- write_file: Create/update files (code, config, HTML, etc)
- read_file: Read existing files
- list_directory: Explore filesystem
- get_processes: Check what's running

### GitHub Tools
- github_clone: Clone repositories
- github_search: Search code/repos
- github_issue: Manage issues
- github_pr: Manage pull requests

### Web Tools
- web_fetch: Fetch webpage content
- web_extract: Extract data with CSS selectors

### File Tools
- file_search: Search files by pattern (glob)
- file_diff: Show diff between files
- file_backup: Backup files

### Process Tools
- process_start: Start background processes
- process_list: List managed processes
- process_stop: Stop processes
- process_restart: Restart processes
- process_logs: View process logs

### 🎨 MULTIMODAL TOOLS (Image/Video/Audio Generation)

**Replicate (5 tools):**
- replicate_generate_image: Generate images with AI (Flux, SDXL, Stable Diffusion)
- replicate_generate_video: Generate videos from text or animate images
- replicate_run_model: Run ANY Replicate model with custom parameters
- replicate_upscale_image: AI upscaling (2x, 4x, 8x)
- replicate_remove_background: Remove image backgrounds

**ElevenLabs (3 tools):**
- elevenlabs_text_to_speech: Convert text to speech (9+ voices)
- elevenlabs_list_voices: List available voices
- elevenlabs_get_voice_info: Get voice details

**OpenAI (4 tools):**
- openai_generate_image: Generate images with DALL-E 2/3
- openai_gpt_chat: Use GPT-4 for specialized tasks
- openai_transcribe_audio: Convert audio to text (Whisper)
- openai_analyze_image: Analyze images with GPT-4 Vision

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

### Development
- "sobe uma FastAPI" → Install fastapi, create main.py, start uvicorn
- "cria um React app" → npm create vite, install deps, npm run dev
- "deploy com Docker" → Create Dockerfile, docker build, docker run
- "API em Go" → go mod init, create main.go, go run

### Multimodal (Image/Video/Audio)
- "gera uma imagem de X" → Use replicate_generate_image or openai_generate_image
- "cria um vídeo de X" → Use replicate_generate_video
- "converte esse texto para áudio" → Use elevenlabs_text_to_speech
- "transcreve esse áudio" → Use openai_transcribe_audio
- "analisa essa imagem" → Use openai_analyze_image
- "remove o fundo dessa imagem" → Use replicate_remove_background
- "aumenta a resolução 4x" → Use replicate_upscale_image

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
- Handle errors gracefully

## Response Formatting for Discord
When providing code examples or command outputs:
- Use Discord markdown: \`\`\`bash (triple backticks with language)
- NEVER use XML-style tags like <bash>, <python>, etc.
- Keep responses clean and readable
- Example:
  \`\`\`bash
  npm install fastapi
  uvicorn main:app
  \`\`\`

## Media/Image Response Format
When generating images/videos/audio:
- Always show the preview/embed in Discord
- Provide download link
- Use Discord embeds for better presentation`;

  let messages: MessageParam[] = [
    ...history,
    {
      role: 'user',
      content: userMessage,
    },
  ];

  // Check and compact context if needed (30k reserve)
  const compactionResult = await checkAndCompactContext(messages, systemPrompt);
  messages = compactionResult.messages;

  if (compactionResult.result.compacted) {
    log.info('[Agent] Context compacted', {
      originalMessages: compactionResult.result.originalCount,
      compactedMessages: compactionResult.result.compactedCount,
      originalTokens: compactionResult.result.originalTokens,
      compactedTokens: compactionResult.result.compactedTokens,
      savedTokens: compactionResult.result.originalTokens - compactionResult.result.compactedTokens
    });
  }

  let iteration = 0;
  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
    tools: TOOLS,
  });

  // Track cost for initial LLM call
  if (response.usage && telemetry.isEnabled()) {
    const cost = telemetry.calculateCost(
      MODEL,
      response.usage.input_tokens || 0,
      response.usage.output_tokens || 0
    );
    telemetry.trackCost({
      inputTokens: response.usage.input_tokens || 0,
      outputTokens: response.usage.output_tokens || 0,
      model: MODEL,
      estimatedCost: cost
    }, userId, 'agent_loop');
  }

  // Agent loop - continue while Claude wants to use tools
  while (response.stop_reason === 'tool_use' && iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`[Agent] Iteration ${iteration}`);

    // Parse response using new output parser if feature is enabled
    let parsedResponse: AgentResponse | null = null;
    if (featureFlags.isEnabled(Feature.OUTPUT_PARSER)) {
      try {
        parsedResponse = OutputParser.parseClaudeResponse(response);
        log.debug('[Agent] Using OutputParser for response parsing');
      } catch (error) {
        log.warn('[Agent] OutputParser failed, falling back to legacy parsing', { error });
      }
    }

    // Execute all tool calls
    const toolResults: Anthropic.MessageParam = {
      role: 'user',
      content: [],
    };

    // Use parsed tool calls if available, otherwise use legacy method
    const toolCalls = parsedResponse?.toolCalls ||
      response.content.filter((block: any) => block.type === 'tool_use');

    for (const toolCall of toolCalls) {
      // Handle both new and legacy format
      const toolName = (toolCall as any).name;
      const toolInput = (toolCall as any).input;
      const toolId = (toolCall as any).id;

      console.log(`[Agent] Executing tool: ${toolName}`);

      // Pass userMessage as context for security vetter, and trustLevel for access control
      const result = await executeTool(toolName, toolInput, userId, userMessage, trustLevel);

      (toolResults.content as any[]).push({
        type: 'tool_result',
        tool_use_id: toolId,
        content: result,
      });
    }

    // Add assistant response and tool results to messages
    messages.push({
      role: 'assistant',
      content: response.content,
    });

    // Only add tool results if there are any (avoid empty user messages)
    if ((toolResults.content as any[]).length > 0) {
      messages.push(toolResults);
    }

    // Check and compact context before continuing (tool results can be large)
    const loopCompaction = await checkAndCompactContext(messages, systemPrompt);
    messages = loopCompaction.messages;

    if (loopCompaction.result.compacted) {
      log.info('[Agent] Context compacted in loop', {
        iteration,
        originalMessages: loopCompaction.result.originalCount,
        compactedMessages: loopCompaction.result.compactedCount,
        savedTokens: loopCompaction.result.originalTokens - loopCompaction.result.compactedTokens
      });
    }

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
  let finalMessage: string;

  if (featureFlags.isEnabled(Feature.OUTPUT_PARSER)) {
    try {
      const parsedResponse = OutputParser.parseClaudeResponse(response);
      finalMessage = parsedResponse.text || 'Task completed.';
    } catch (error) {
      log.warn('[Agent] OutputParser failed for final message, using legacy', { error });
      finalMessage = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => (block as any).text)
        .join('\n\n');
    }
  } else {
    finalMessage = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => (block as any).text)
      .join('\n\n');
  }

  console.log(`[Agent] Completed after ${iteration} iterations`);

  return finalMessage || 'Task completed.';
}

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
import { activityTracker } from './activity/activity-tracker';
import { langfuse } from './observability/langfuse';
import { memory } from './memory/vector-memory';

// Agent always uses Claude API because tools require advanced capabilities
// Local models don't support function calling yet
const router = getRouter();
const claudeProvider = router.getClaudeProvider() as any;
const client = claudeProvider.getClient();

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-20250514';
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
  botName?: string; // Optional bot name for tracking
}

// Helper function to calculate Claude API cost
function calculateClaudeCost(inputTokens: number, outputTokens: number, model: string): number {
  let inputCostPerMtok = 3; // Sonnet default
  let outputCostPerMtok = 15;

  if (model.includes('opus')) {
    inputCostPerMtok = 15;
    outputCostPerMtok = 75;
  } else if (model.includes('haiku')) {
    inputCostPerMtok = 0.25;
    outputCostPerMtok = 1.25;
  }

  const inputCost = (inputTokens / 1_000_000) * inputCostPerMtok;
  const outputCost = (outputTokens / 1_000_000) * outputCostPerMtok;

  return inputCost + outputCost;
}

// Helper function to track LLM call with Langfuse
async function trackLLMCall(
  userId: string,
  botName: string | undefined,
  messages: any[],
  response: Anthropic.Message,
  latency: number
): Promise<void> {
  if (!langfuse.isEnabled()) return;

  try {
    const cost = calculateClaudeCost(
      response.usage.input_tokens,
      response.usage.output_tokens,
      response.model
    );

    // Convert Anthropic messages to LLMMessage format
    const llmMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));

    await langfuse.trackGeneration({
      userId,
      botName: botName || 'main-agent',
      provider: 'claude',
      model: response.model,
      messages: llmMessages,
      response: {
        content: JSON.stringify(response.content),
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      },
      latency,
      cost,
      metadata: {
        stopReason: response.stop_reason,
        toolsUsed: response.content.filter(c => c.type === 'tool_use').length,
      },
    });
  } catch (error: any) {
    log.error('[Agent] Langfuse tracking failed', { error: error.message });
  }
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
  const { userId, userMessage, history, trustLevel, botName } = options;
  const agentStartTime = Date.now();

  // Retrieve vector memory context (if enabled)
  let memoryContext = '';
  if (memory.isEnabled() && botName) {
    try {
      const context = await memory.getContext(
        botName,
        userId,
        userMessage,
        3, // recent messages
        5  // relevant memories
      );

      if (context.summary) {
        memoryContext = `\n\n# MEMORY CONTEXT\n\nThe following context was retrieved from long-term memory:\n\n${context.summary}\n\nUse this context to provide more personalized and contextually relevant responses.\n`;
        
        log.info('[Agent] Memory context retrieved', {
          botName,
          userId,
          recentCount: context.recent.length,
          relevantCount: context.relevant.length,
        });
      }
    } catch (error: any) {
      log.error('[Agent] Memory retrieval failed', {
        error: error.message,
        botName,
        userId,
      });
    }
  }

  const systemPrompt = workspace.getSystemPrompt() + memoryContext + `

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
- web_fetch: Fetch webpage content (NOT for GitHub - use execute_shell with gh CLI)
- web_extract: Extract data with CSS selectors
- brave_web_search: Search the web (Brave API)

**IMPORTANT:** For GitHub repos, NEVER use web_fetch. Use execute_shell with gh CLI:
- \`gh repo view owner/repo\` - Get repo info
- \`gh api repos/owner/repo\` - Get repo JSON
- \`gh api repos/owner/repo/readme\` - Get README
- \`gh search repos "query"\` - Search repos

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

## How to Use Tools - CRITICAL INSTRUCTIONS

**IMPORTANT:** You MUST use tools to execute actions. NEVER describe what you would do - ACTUALLY DO IT.

When user asks you to:
- Create/modify files → USE write_file tool (don't describe, DO IT)
- Run commands → USE execute_shell tool (don't describe, DO IT)
- Clone repos → USE execute_shell with git clone (don't describe, DO IT)
- Make commits → USE execute_shell with git commands (don't describe, DO IT)
- Check files → USE read_file or list_directory (don't describe, DO IT)

**NEVER respond with**:
- ❌ "I will create a file..." (just create it!)
- ❌ "Let me run this command..." (just run it!)
- ❌ Fake command outputs (use real tool execution!)
- ❌ Made-up links or commit hashes (only real ones from tool outputs!)
- ❌ Raw JSON from tool outputs (summarize the results!)
- ❌ Entire file contents dumped in response (summarize or show relevant parts only!)
- ❌ Long code dumps (show only the important parts, max 20 lines)

**ALWAYS**:
- ✅ Use tools immediately when action is needed
- ✅ SUMMARIZE tool outputs - don't dump raw content
- ✅ When showing code, show only relevant snippets (max 20 lines)
- ✅ Present information in a clean, readable format for Discord
- ✅ Use bullet points and short paragraphs
- ✅ Show REAL output from tools
- ✅ Verify results with additional tool calls if needed
- ✅ Report actual errors if tools fail

When user asks to create/deploy something:
1. Use tools to execute the task
2. Be proactive - install packages, create files, start servers
3. Show clear results with URLs/endpoints/next steps from REAL tool outputs

## SECURITY BEST PRACTICES - AUTOMATIC
When creating or cloning ANY repository:
1. ALWAYS run \`secure_repo\` to apply security templates (.gitignore, pre-commit hooks, secret manager)
2. NEVER hardcode API keys, tokens, or passwords in code - use environment variables
3. ALWAYS create a .env.example (not .env) for reference
4. Use \`scan_repo_secrets\` before pushing to check for exposed credentials
5. For GCP projects, integrate Google Secret Manager for production secrets

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
- Container: Kubernetes (GKE)
- Working dir: /app (read-only)
- Self-improvement repo: /data/repo (writable, git enabled)
- Background processes: Use & at end (uvicorn main:app &)
- Filesystem: /app is read-only, /data is persistent

## Self-Improvement (OWNER ONLY)
When an OWNER asks you to modify your own code:
1. Work in /data/repo (your cloned repository)
2. Make changes using write_file
3. Commit with: cd /data/repo && git add -A && git commit -m "description"
4. Push with: cd /data/repo && git push origin main
5. Report the commit hash

Example for self-improvement:
\`\`\`bash
# Edit file
cd /data/repo && echo "new code" > src/new-feature.ts

# Commit and push
cd /data/repo && git add -A && git commit -m "feat: add new feature" && git push origin main
\`\`\`

Repository: https://github.com/opencellcw/ulf-warden
IMPORTANT: Only OWNER trust level can request self-modifications!

## Important
- Run servers in background with &
- Show clear, actionable results
- Provide URLs when applicable
- Handle errors gracefully

## Response Formatting for Discord
When providing code examples or command outputs:
- Use Discord markdown: \`\`\`bash (triple backticks with language)
- Keep responses clean and readable
- Example:
  \`\`\`bash
  npm install fastapi
  uvicorn main:app
  \`\`\`

## CRITICAL: Tool Call Format
- NEVER output XML-style tags in your text responses
- DO NOT write <function_calls>, <invoke>, <parameter>, or similar XML tags
- The Anthropic API handles tool calls as structured objects automatically
- You just call tools using the API's native format - they execute in the background
- Your TEXT response should only contain human-readable content for Discord
- If you need to use a tool, use it via the API, don't write XML in your response

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
  
  // Measure latency for Langfuse
  const startTime = Date.now();
  
  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages,
    tools: TOOLS,
  });

  const latency = Date.now() - startTime;

  // Track with Langfuse (observability)
  await trackLLMCall(userId, options.botName, messages, response, latency);

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
    const iterationStartTime = Date.now();
    
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      tools: TOOLS,
    });

    const iterationLatency = Date.now() - iterationStartTime;
    
    // Track with Langfuse (observability)
    await trackLLMCall(userId, options.botName, messages, response, iterationLatency);
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

  // 🔧 FIX: Include tool results with URLs/media in final response
  // Find the last tool results in messages history
  const lastToolResults = messages
    .slice()
    .reverse()
    .find((msg: any) => msg.role === 'user' && Array.isArray(msg.content));

  if (lastToolResults && Array.isArray(lastToolResults.content)) {
    for (const block of lastToolResults.content) {
      if (block.type === 'tool_result' && typeof block.content === 'string') {
        // Check if tool result contains media URLs (image/video/audio)
        const hasMediaURL = 
          block.content.includes('URL:') || 
          block.content.includes('replicate.delivery') ||
          block.content.includes('oaidalleapiprodscus') ||
          block.content.includes('https://') && (
            block.content.includes('image') ||
            block.content.includes('video') ||
            block.content.includes('audio')
          );

        if (hasMediaURL) {
          // Append tool result to final message (Claude sometimes omits the URL)
          log.info('[Agent] Appending media URL from tool result to final message');
          finalMessage += '\n\n' + block.content;
        }
      }
    }
  }

  console.log(`[Agent] Completed after ${iteration} iterations`);
  activityTracker.emitCompleted(iteration, Date.now() - agentStartTime);

  // Store interaction in vector memory (if enabled)
  if (memory.isEnabled() && botName) {
    try {
      // Store user message
      await memory.storeMessage(botName, userId, 'user', userMessage);
      
      // Store assistant response
      await memory.storeMessage(botName, userId, 'assistant', finalMessage);
      
      log.info('[Agent] Interaction stored in memory', {
        botName,
        userId,
      });
    } catch (error: any) {
      log.error('[Agent] Memory storage failed', {
        error: error.message,
        botName,
        userId,
      });
    }
  }

  return finalMessage || 'Task completed.';
}

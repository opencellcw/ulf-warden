"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
const workspace_1 = require("./workspace");
const tools_1 = require("./tools");
const llm_1 = require("./llm");
const logger_1 = require("./logger");
const output_parser_1 = require("./core/output-parser");
const feature_flags_1 = require("./core/feature-flags");
// Agent always uses Claude API because tools require advanced capabilities
// Local models don't support function calling yet
const router = (0, llm_1.getRouter)();
const claudeProvider = router.getClaudeProvider();
const client = claudeProvider.getClient();
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
const MAX_ITERATIONS = 30; // Prevent infinite loops
async function runAgent(options) {
    const { userId, userMessage, history } = options;
    // Log available media tools
    const hasReplicate = !!process.env.REPLICATE_API_TOKEN;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
    logger_1.log.info('[Agent] Starting agent with tool support', {
        userId,
        mediaTools: {
            replicate: hasReplicate,
            openai: hasOpenAI,
            elevenlabs: hasElevenLabs
        }
    });
    const systemPrompt = workspace_1.workspace.getSystemPrompt() + `

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
        // Parse response using new output parser if feature is enabled
        let parsedResponse = null;
        if (feature_flags_1.featureFlags.isEnabled(feature_flags_1.Feature.OUTPUT_PARSER)) {
            try {
                parsedResponse = output_parser_1.OutputParser.parseClaudeResponse(response);
                logger_1.log.debug('[Agent] Using OutputParser for response parsing');
            }
            catch (error) {
                logger_1.log.warn('[Agent] OutputParser failed, falling back to legacy parsing', { error });
            }
        }
        // Execute all tool calls
        const toolResults = {
            role: 'user',
            content: [],
        };
        // Use parsed tool calls if available, otherwise use legacy method
        const toolCalls = parsedResponse?.toolCalls ||
            response.content.filter((block) => block.type === 'tool_use');
        for (const toolCall of toolCalls) {
            // Handle both new and legacy format
            const toolName = toolCall.name;
            const toolInput = toolCall.input;
            const toolId = toolCall.id;
            console.log(`[Agent] Executing tool: ${toolName}`);
            // Pass userMessage as context for security vetter
            const result = await (0, tools_1.executeTool)(toolName, toolInput, userId, userMessage);
            toolResults.content.push({
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
    let finalMessage;
    if (feature_flags_1.featureFlags.isEnabled(feature_flags_1.Feature.OUTPUT_PARSER)) {
        try {
            const parsedResponse = output_parser_1.OutputParser.parseClaudeResponse(response);
            finalMessage = parsedResponse.text || 'Task completed.';
        }
        catch (error) {
            logger_1.log.warn('[Agent] OutputParser failed for final message, using legacy', { error });
            finalMessage = response.content
                .filter((block) => block.type === 'text')
                .map((block) => block.text)
                .join('\n\n');
        }
    }
    else {
        finalMessage = response.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('\n\n');
    }
    console.log(`[Agent] Completed after ${iteration} iterations`);
    return finalMessage || 'Task completed.';
}

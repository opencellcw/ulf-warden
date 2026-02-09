import Anthropic from '@anthropic-ai/sdk';
import { dailyLogger } from '../memory/daily-logger';
import { memoryLoader } from '../memory/memory-loader';
import { log } from '../logger';

/**
 * Memory Search Tool
 *
 * Allows agent to search past memory for relevant information.
 */

export const MEMORY_SEARCH_TOOL: Anthropic.Tool = {
  name: 'memory_search',
  description: `Search past memory for relevant information.

Use this to:
- Remember past conversations or decisions
- Find information from previous sessions
- Recall how similar problems were solved
- Look up facts or context from history

Examples:
- "What did we discuss about deployment?"
- "How did we fix the Redis issue last time?"
- "What are the rate limits we configured?"`,
  input_schema: {
    type: 'object',
    properties: {
      keyword: {
        type: 'string',
        description: 'Keyword or topic to search for (e.g., "deploy", "Redis", "rate limit")'
      },
      days: {
        type: 'number',
        description: 'How many days back to search (default: 30)',
        default: 30
      }
    },
    required: ['keyword']
  }
};

export const MEMORY_RECALL_TOOL: Anthropic.Tool = {
  name: 'memory_recall',
  description: `Recall recent memory context (last few days).

Use this to:
- Get overview of recent activities
- Remember what happened recently
- Understand current context
- Refresh memory after long pause

No parameters needed - returns last 3 days of memory.`,
  input_schema: {
    type: 'object',
    properties: {
      days: {
        type: 'number',
        description: 'Number of days to recall (default: 3)',
        default: 3
      }
    },
    required: []
  }
};

export const MEMORY_TOOLS = [MEMORY_SEARCH_TOOL, MEMORY_RECALL_TOOL];

/**
 * Execute memory search tool
 */
export async function executeMemorySearch(input: {
  keyword: string;
  days?: number;
}): Promise<string> {
  try {
    const { keyword, days = 30 } = input;

    log.info('[MemorySearch] Searching memory', { keyword, days });

    const results = await memoryLoader.searchMemory(keyword, days);

    if (results.includes('No results found')) {
      return `🔍 No results found for "${keyword}" in the last ${days} days.\n\nTry:\n- Different keywords\n- Broader search terms\n- Increasing days to search`;
    }

    return `🔍 **Memory Search Results**\n\n${results}`;
  } catch (error: any) {
    log.error('[MemorySearch] Search failed', { error: error.message });
    return `❌ Failed to search memory: ${error.message}`;
  }
}

/**
 * Execute memory recall tool
 */
export async function executeMemoryRecall(input: { days?: number }): Promise<string> {
  try {
    const { days = 3 } = input;

    log.info('[MemoryRecall] Recalling recent memory', { days });

    const context = await memoryLoader.loadRecentContext(days);

    if (!context.recentLogs) {
      return `📝 No recent memory available for the last ${days} days.`;
    }

    // Trim if too large
    const trimmed = memoryLoader.trimContext(context.recentLogs, 2000);

    return `📝 **Recent Memory (Last ${days} Days)**\n\n${trimmed}\n\n${context.summary}`;
  } catch (error: any) {
    log.error('[MemoryRecall] Recall failed', { error: error.message });
    return `❌ Failed to recall memory: ${error.message}`;
  }
}

/**
 * Execute memory tool
 */
export async function executeMemoryTool(
  toolName: string,
  toolInput: any
): Promise<string> {
  switch (toolName) {
    case 'memory_search':
      return await executeMemorySearch(toolInput);

    case 'memory_recall':
      return await executeMemoryRecall(toolInput);

    default:
      return `Unknown memory tool: ${toolName}`;
  }
}

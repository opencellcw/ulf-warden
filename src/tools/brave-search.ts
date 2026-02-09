import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { log } from '../logger';

/**
 * Brave Search API Integration
 *
 * Provides web search capabilities with privacy-focused Brave Search API
 * Features:
 * - Web search with ranking
 * - News search
 * - Image search (optional)
 * - Safe search
 * - Freshness filters
 */

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
}

interface BraveWebSearchResponse {
  web?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
      age?: string;
      extra_snippets?: string[];
    }>;
  };
  news?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
      age?: string;
    }>;
  };
}

export const BRAVE_SEARCH_TOOLS: Anthropic.Tool[] = [
  {
    name: 'brave_web_search',
    description: `Search the web using Brave Search API (privacy-focused).

Perfect for:
- Finding current information and news
- Researching topics
- Finding documentation and resources
- Checking facts and recent events
- Discovering websites and tools

Returns ranked search results with titles, URLs, and descriptions.

Examples:
- "latest news about AI"
- "how to deploy kubernetes on GCP"
- "best practices for rate limiting"
- "anthropic claude 4 features"`,
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (natural language or keywords)'
        },
        count: {
          type: 'number',
          description: 'Number of results to return (default: 10, max: 20)',
          default: 10
        },
        freshness: {
          type: 'string',
          description: 'Filter by freshness',
          enum: ['pd', 'pw', 'pm', 'py'], // past day, week, month, year
        },
        search_lang: {
          type: 'string',
          description: 'Search language (default: en)',
          default: 'en'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'brave_news_search',
    description: `Search for recent news articles using Brave Search.

Focuses on:
- Latest news and current events
- Breaking stories
- Recent announcements
- Industry news

Returns news articles with titles, URLs, descriptions, and publication dates.`,
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'News search query'
        },
        count: {
          type: 'number',
          description: 'Number of news results (default: 10, max: 20)',
          default: 10
        }
      },
      required: ['query']
    }
  }
];

export async function executeBraveSearchTool(
  toolName: string,
  toolInput: any
): Promise<string> {
  switch (toolName) {
    case 'brave_web_search':
      return await braveWebSearch(toolInput);
    case 'brave_news_search':
      return await braveNewsSearch(toolInput);
    default:
      throw new Error(`Unknown Brave Search tool: ${toolName}`);
  }
}

async function braveWebSearch(input: any): Promise<string> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new Error('BRAVE_API_KEY not configured');
  }

  const { query, count = 10, freshness, search_lang = 'en' } = input;

  try {
    log.info('[Brave] Web search', { query, count, freshness });

    const params: any = {
      q: query,
      count: Math.min(count, 20),
      search_lang,
      safesearch: 'moderate'
    };

    if (freshness) {
      params.freshness = freshness;
    }

    const response = await axios.get<BraveWebSearchResponse>(
      'https://api.search.brave.com/res/v1/web/search',
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey
        },
        params,
        timeout: 10000
      }
    );

    const results = response.data.web?.results || [];

    if (results.length === 0) {
      return `❌ No results found for: "${query}"`;
    }

    log.info('[Brave] Search completed', { resultCount: results.length });

    // Format results
    let output = `🔍 **Web Search Results for:** "${query}"\n\n`;
    output += `Found ${results.length} results:\n\n`;

    results.slice(0, count).forEach((result, index) => {
      output += `**${index + 1}. ${result.title}**\n`;
      output += `🔗 ${result.url}\n`;
      output += `📝 ${result.description}\n`;
      if (result.age) {
        output += `📅 ${result.age}\n`;
      }

      // Add extra snippets if available
      if (result.extra_snippets && result.extra_snippets.length > 0) {
        output += `📄 Additional context:\n`;
        result.extra_snippets.slice(0, 2).forEach(snippet => {
          output += `   • ${snippet}\n`;
        });
      }

      output += `\n`;
    });

    return output;
  } catch (error: any) {
    log.error('[Brave] Search failed', { error: error.message });

    if (error.response?.status === 401) {
      throw new Error('Invalid BRAVE_API_KEY. Please check your API key.');
    }
    if (error.response?.status === 429) {
      throw new Error('Brave API rate limit exceeded. Please try again later.');
    }

    throw new Error(`Brave search failed: ${error.message}`);
  }
}

async function braveNewsSearch(input: any): Promise<string> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) {
    throw new Error('BRAVE_API_KEY not configured');
  }

  const { query, count = 10 } = input;

  try {
    log.info('[Brave] News search', { query, count });

    const response = await axios.get<BraveWebSearchResponse>(
      'https://api.search.brave.com/res/v1/web/search',
      {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey
        },
        params: {
          q: query,
          count: Math.min(count, 20),
          result_filter: 'news', // Focus on news
          safesearch: 'moderate'
        },
        timeout: 10000
      }
    );

    const newsResults = response.data.news?.results || [];

    if (newsResults.length === 0) {
      return `❌ No news articles found for: "${query}"`;
    }

    log.info('[Brave] News search completed', { resultCount: newsResults.length });

    // Format news results
    let output = `📰 **News Results for:** "${query}"\n\n`;
    output += `Found ${newsResults.length} articles:\n\n`;

    newsResults.slice(0, count).forEach((article, index) => {
      output += `**${index + 1}. ${article.title}**\n`;
      output += `🔗 ${article.url}\n`;
      output += `📝 ${article.description}\n`;
      if (article.age) {
        output += `📅 ${article.age}\n`;
      }
      output += `\n`;
    });

    return output;
  } catch (error: any) {
    log.error('[Brave] News search failed', { error: error.message });

    if (error.response?.status === 401) {
      throw new Error('Invalid BRAVE_API_KEY. Please check your API key.');
    }
    if (error.response?.status === 429) {
      throw new Error('Brave API rate limit exceeded. Please try again later.');
    }

    throw new Error(`Brave news search failed: ${error.message}`);
  }
}

import axios from 'axios';
import * as cheerio from 'cheerio';
import { log } from '../logger';

/**
 * Internet Bridge
 *
 * Provides web search and documentation fetching capabilities
 */
export class InternetBridge {
  private readonly tavilyApiKey: string | null;
  private readonly perplexityApiKey: string | null;

  constructor() {
    this.tavilyApiKey = process.env.TAVILY_API_KEY || null;
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || null;

    log.info('[InternetBridge] Initialized', {
      hasTavily: !!this.tavilyApiKey,
      hasPerplexity: !!this.perplexityApiKey
    });
  }

  /**
   * Search the web using available APIs
   */
  async searchWeb(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    log.info('[InternetBridge] Searching web', { query, maxResults });

    // Try Tavily first (best for search)
    if (this.tavilyApiKey) {
      try {
        return await this.searchWithTavily(query, maxResults);
      } catch (error: any) {
        log.warn('[InternetBridge] Tavily search failed', {
          error: error.message
        });
      }
    }

    // Fallback to Perplexity
    if (this.perplexityApiKey) {
      try {
        return await this.searchWithPerplexity(query, maxResults);
      } catch (error: any) {
        log.warn('[InternetBridge] Perplexity search failed', {
          error: error.message
        });
      }
    }

    // No APIs available
    log.warn('[InternetBridge] No search APIs configured');
    return [];
  }

  /**
   * Search with Tavily API
   */
  private async searchWithTavily(query: string, maxResults: number): Promise<SearchResult[]> {
    const response = await axios.post(
      'https://api.tavily.com/search',
      {
        api_key: this.tavilyApiKey,
        query,
        max_results: maxResults,
        include_answer: true,
        include_raw_content: false
      }
    );

    const results: SearchResult[] = [];

    if (response.data.results) {
      for (const result of response.data.results) {
        results.push({
          title: result.title,
          url: result.url,
          snippet: result.content,
          score: result.score || 0
        });
      }
    }

    // Add AI-generated answer if available
    if (response.data.answer) {
      results.unshift({
        title: 'AI Summary',
        url: '',
        snippet: response.data.answer,
        score: 1.0
      });
    }

    log.info('[InternetBridge] Tavily search complete', {
      resultsCount: results.length
    });

    return results;
  }

  /**
   * Search with Perplexity API
   */
  private async searchWithPerplexity(query: string, maxResults: number): Promise<SearchResult[]> {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'Be precise and concise. Provide sources.'
          },
          {
            role: 'user',
            content: query
          }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${this.perplexityApiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const answer = response.data.choices[0]?.message?.content || '';
    const citations = response.data.citations || [];

    const results: SearchResult[] = [];

    // Add AI answer
    if (answer) {
      results.push({
        title: 'Perplexity Answer',
        url: '',
        snippet: answer,
        score: 1.0
      });
    }

    // Add citations
    for (const citation of citations.slice(0, maxResults)) {
      results.push({
        title: citation.title || citation.url,
        url: citation.url,
        snippet: citation.snippet || '',
        score: 0.8
      });
    }

    log.info('[InternetBridge] Perplexity search complete', {
      resultsCount: results.length
    });

    return results;
  }

  /**
   * Fetch and parse documentation from URL
   */
  async fetchDocs(url: string): Promise<string> {
    try {
      log.info('[InternetBridge] Fetching docs', { url });

      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Ulfberht-Warden/1.0'
        }
      });

      // Parse HTML
      const $ = cheerio.load(response.data);

      // Remove script and style tags
      $('script').remove();
      $('style').remove();
      $('nav').remove();
      $('header').remove();
      $('footer').remove();

      // Extract main content
      let content = $('main').text() || $('article').text() || $('body').text();

      // Clean up whitespace
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();

      log.info('[InternetBridge] Docs fetched', {
        url,
        length: content.length
      });

      return content.substring(0, 10000); // Limit to 10k chars
    } catch (error: any) {
      log.error('[InternetBridge] Failed to fetch docs', {
        url,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Search for code examples on GitHub
   */
  async searchGitHub(query: string, language?: string): Promise<CodeSearchResult[]> {
    try {
      log.info('[InternetBridge] Searching GitHub', { query, language });

      const searchQuery = language ? `${query} language:${language}` : query;

      const response = await axios.get(
        `https://api.github.com/search/code`,
        {
          params: {
            q: searchQuery,
            sort: 'indexed',
            order: 'desc',
            per_page: 5
          },
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Ulfberht-Warden/1.0'
          }
        }
      );

      const results: CodeSearchResult[] = [];

      if (response.data.items) {
        for (const item of response.data.items) {
          results.push({
            name: item.name,
            path: item.path,
            url: item.html_url,
            repository: item.repository.full_name,
            score: item.score
          });
        }
      }

      log.info('[InternetBridge] GitHub search complete', {
        resultsCount: results.length
      });

      return results;
    } catch (error: any) {
      log.error('[InternetBridge] GitHub search failed', {
        error: error.message
      });
      return [];
    }
  }
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

export interface CodeSearchResult {
  name: string;
  path: string;
  url: string;
  repository: string;
  score: number;
}

// Export singleton
let internetBridgeInstance: InternetBridge | null = null;

export function getInternetBridge(): InternetBridge {
  if (!internetBridgeInstance) {
    internetBridgeInstance = new InternetBridge();
  }
  return internetBridgeInstance;
}

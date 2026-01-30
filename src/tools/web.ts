import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import * as cheerio from 'cheerio';

export const WEB_TOOLS: Anthropic.Tool[] = [
  {
    name: 'web_fetch',
    description: `Fetch and parse webpage content. Returns text content or specific elements using CSS selectors.

Examples:
- Fetch page: url="https://example.com"
- Extract title: url="https://example.com", selector="h1"
- Extract links: url="https://example.com", selector="a"
- Get specific element: url="https://example.com", selector=".main-content"

Timeout: 15 seconds
Max size: 5MB`,
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to fetch'
        },
        selector: {
          type: 'string',
          description: 'Optional CSS selector to extract specific content'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'web_extract',
    description: `Extract structured data from a webpage using CSS selectors.

Examples:
- Extract titles: url="https://example.com", selectors={"title": "h1", "description": "p.desc"}
- Extract list: url="https://example.com", selectors={"items": "li.item"}

Returns a JSON object with extracted data.`,
    input_schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to fetch'
        },
        selectors: {
          type: 'object',
          description: 'Object mapping keys to CSS selectors'
        }
      },
      required: ['url', 'selectors']
    }
  }
];

export async function executeWebTool(toolName: string, input: any): Promise<string> {
  try {
    switch (toolName) {
      case 'web_fetch':
        return await webFetch(input);
      case 'web_extract':
        return await webExtract(input);
      default:
        return `Unknown web tool: ${toolName}`;
    }
  } catch (error: any) {
    return `Error executing ${toolName}: ${error.message}`;
  }
}

async function webFetch(input: any): Promise<string> {
  const { url, selector } = input;

  try {
    // Validate URL
    new URL(url);

    // Fetch the webpage
    const response = await axios.get(url, {
      timeout: 15000, // 15 seconds
      maxContentLength: 5 * 1024 * 1024, // 5MB
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Ulfberht-Warden/1.0; +https://github.com/yourusername/ulfberht-warden)'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // If selector provided, extract specific content
    if (selector) {
      const elements = $(selector);

      if (elements.length === 0) {
        return `No elements found matching selector: ${selector}`;
      }

      const results: string[] = [];
      elements.each((i, elem) => {
        const text = $(elem).text().trim();
        const href = $(elem).attr('href');

        if (href) {
          results.push(`${text} (${href})`);
        } else {
          results.push(text);
        }
      });

      return results.join('\n');
    }

    // No selector - return cleaned text content
    // Remove script and style tags
    $('script, style, nav, footer, header').remove();

    // Get title
    const title = $('title').text().trim();

    // Get main content
    let content = $('body').text().trim();

    // Clean up whitespace
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    // Truncate if too long
    const maxLength = 5000;
    if (content.length > maxLength) {
      content = content.substring(0, maxLength) + '...';
    }

    return `Title: ${title}\n\nContent:\n${content}`;
  } catch (error: any) {
    if (error.code === 'ENOTFOUND') {
      return `Failed to fetch URL: Domain not found`;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return `Failed to fetch URL: Timeout`;
    } else if (error.response) {
      return `Failed to fetch URL: HTTP ${error.response.status} ${error.response.statusText}`;
    } else {
      return `Failed to fetch URL: ${error.message}`;
    }
  }
}

async function webExtract(input: any): Promise<string> {
  const { url, selectors } = input;

  try {
    // Validate URL
    new URL(url);

    // Validate selectors
    if (typeof selectors !== 'object' || Array.isArray(selectors)) {
      return 'Selectors must be an object mapping keys to CSS selectors';
    }

    // Fetch the webpage
    const response = await axios.get(url, {
      timeout: 15000,
      maxContentLength: 5 * 1024 * 1024,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Ulfberht-Warden/1.0)'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Extract data for each selector
    const results: Record<string, any> = {};

    for (const [key, selector] of Object.entries(selectors)) {
      const elements = $(selector as string);

      if (elements.length === 0) {
        results[key] = null;
      } else if (elements.length === 1) {
        // Single element - return text
        results[key] = elements.text().trim();
      } else {
        // Multiple elements - return array
        const items: string[] = [];
        elements.each((i, elem) => {
          items.push($(elem).text().trim());
        });
        results[key] = items;
      }
    }

    return JSON.stringify(results, null, 2);
  } catch (error: any) {
    if (error.code === 'ENOTFOUND') {
      return `Failed to fetch URL: Domain not found`;
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return `Failed to fetch URL: Timeout`;
    } else if (error.response) {
      return `Failed to fetch URL: HTTP ${error.response.status}`;
    } else {
      return `Failed to extract data: ${error.message}`;
    }
  }
}

import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ToolHandler } from '../../core/tool-registry';

// Input schema
const WebFetchInputSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  timeout: z.number().optional().default(10000)
});

const MAX_CONTENT_LENGTH = 50000; // chars

/**
 * Convert HTML to markdown-like text
 */
function htmlToText(html: string): string {
  const $ = cheerio.load(html);

  // Remove script and style elements
  $('script, style, noscript').remove();

  // Get text content
  let text = $('body').text();

  // Clean up whitespace
  text = text
    .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
    .replace(/[ \t]+/g, ' ') // Collapse spaces
    .trim();

  // Truncate if too long
  if (text.length > MAX_CONTENT_LENGTH) {
    text = text.substring(0, MAX_CONTENT_LENGTH) + '\n\n... [CONTENT TRUNCATED]';
  }

  return text;
}

/**
 * Web fetch implementation
 */
async function webFetchHandler(
  input: z.infer<typeof WebFetchInputSchema>,
  context: any
): Promise<string> {
  try {
    console.log(`[WebFetch] Fetching: ${input.url}`);

    const response = await axios.get(input.url, {
      timeout: input.timeout,
      maxContentLength: 10 * 1024 * 1024, // 10MB
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OpenCell/1.0)'
      }
    });

    // Convert HTML to text
    const text = htmlToText(response.data);

    console.log(`[WebFetch] Success: ${input.url} (${text.length} chars)`);
    return text;
  } catch (error: any) {
    console.error(`[WebFetch] Error: ${error.message}`);

    if (error.code === 'ECONNABORTED') {
      throw new Error(`Request timeout after ${input.timeout}ms`);
    }

    if (error.response) {
      throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    }

    throw new Error(`Failed to fetch URL: ${error.message}`);
  }
}

// Export tool handler for auto-discovery
export const toolHandler: ToolHandler = {
  metadata: {
    name: 'web_fetch',
    description: 'Fetch content from a URL and convert it to readable text. Works with HTTP/HTTPS URLs. Automatically extracts main content and removes scripts/styles.',
    category: 'web',
    inputSchema: WebFetchInputSchema,
    tags: ['web', 'http', 'fetch', 'scraping'],
    enabled: true,
    security: {
      idempotent: true, // GET requests are idempotent
      requiresApproval: false,
      riskLevel: 'medium' // Can access external resources
    },
    examples: [
      {
        input: { url: 'https://example.com' },
        output: 'Example Domain\n\nThis domain is for use in illustrative examples...'
      },
      {
        input: { url: 'https://api.github.com', timeout: 5000 },
        output: 'GitHub API content...'
      }
    ]
  },
  execute: webFetchHandler
};

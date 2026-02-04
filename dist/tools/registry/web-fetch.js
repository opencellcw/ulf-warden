"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolHandler = void 0;
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
// Input schema
const WebFetchInputSchema = zod_1.z.object({
    url: zod_1.z.string().url('Must be a valid URL'),
    timeout: zod_1.z.number().optional().default(10000)
});
const MAX_CONTENT_LENGTH = 50000; // chars
/**
 * Convert HTML to markdown-like text
 */
function htmlToText(html) {
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
async function webFetchHandler(input, context) {
    try {
        console.log(`[WebFetch] Fetching: ${input.url}`);
        const response = await axios_1.default.get(input.url, {
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
    }
    catch (error) {
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
exports.toolHandler = {
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

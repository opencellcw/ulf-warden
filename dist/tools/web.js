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
exports.WEB_TOOLS = void 0;
exports.executeWebTool = executeWebTool;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
exports.WEB_TOOLS = [
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
async function executeWebTool(toolName, input) {
    try {
        switch (toolName) {
            case 'web_fetch':
                return await webFetch(input);
            case 'web_extract':
                return await webExtract(input);
            default:
                return `Unknown web tool: ${toolName}`;
        }
    }
    catch (error) {
        return `Error executing ${toolName}: ${error.message}`;
    }
}
async function webFetch(input) {
    const { url, selector } = input;
    try {
        // Validate URL
        new URL(url);
        // Fetch the webpage
        const response = await axios_1.default.get(url, {
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
            const results = [];
            elements.each((i, elem) => {
                const text = $(elem).text().trim();
                const href = $(elem).attr('href');
                if (href) {
                    results.push(`${text} (${href})`);
                }
                else {
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
    }
    catch (error) {
        if (error.code === 'ENOTFOUND') {
            return `Failed to fetch URL: Domain not found`;
        }
        else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return `Failed to fetch URL: Timeout`;
        }
        else if (error.response) {
            return `Failed to fetch URL: HTTP ${error.response.status} ${error.response.statusText}`;
        }
        else {
            return `Failed to fetch URL: ${error.message}`;
        }
    }
}
async function webExtract(input) {
    const { url, selectors } = input;
    try {
        // Validate URL
        new URL(url);
        // Validate selectors
        if (typeof selectors !== 'object' || Array.isArray(selectors)) {
            return 'Selectors must be an object mapping keys to CSS selectors';
        }
        // Fetch the webpage
        const response = await axios_1.default.get(url, {
            timeout: 15000,
            maxContentLength: 5 * 1024 * 1024,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Ulfberht-Warden/1.0)'
            }
        });
        const html = response.data;
        const $ = cheerio.load(html);
        // Extract data for each selector
        const results = {};
        for (const [key, selector] of Object.entries(selectors)) {
            const elements = $(selector);
            if (elements.length === 0) {
                results[key] = null;
            }
            else if (elements.length === 1) {
                // Single element - return text
                results[key] = elements.text().trim();
            }
            else {
                // Multiple elements - return array
                const items = [];
                elements.each((i, elem) => {
                    items.push($(elem).text().trim());
                });
                results[key] = items;
            }
        }
        return JSON.stringify(results, null, 2);
    }
    catch (error) {
        if (error.code === 'ENOTFOUND') {
            return `Failed to fetch URL: Domain not found`;
        }
        else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return `Failed to fetch URL: Timeout`;
        }
        else if (error.response) {
            return `Failed to fetch URL: HTTP ${error.response.status}`;
        }
        else {
            return `Failed to extract data: ${error.message}`;
        }
    }
}

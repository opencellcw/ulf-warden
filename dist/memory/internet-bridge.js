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
exports.InternetBridge = void 0;
exports.getInternetBridge = getInternetBridge;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const logger_1 = require("../logger");
/**
 * Internet Bridge
 *
 * Provides web search and documentation fetching capabilities
 */
class InternetBridge {
    tavilyApiKey;
    perplexityApiKey;
    constructor() {
        this.tavilyApiKey = process.env.TAVILY_API_KEY || null;
        this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || null;
        logger_1.log.info('[InternetBridge] Initialized', {
            hasTavily: !!this.tavilyApiKey,
            hasPerplexity: !!this.perplexityApiKey
        });
    }
    /**
     * Search the web using available APIs
     */
    async searchWeb(query, maxResults = 5) {
        logger_1.log.info('[InternetBridge] Searching web', { query, maxResults });
        // Try Tavily first (best for search)
        if (this.tavilyApiKey) {
            try {
                return await this.searchWithTavily(query, maxResults);
            }
            catch (error) {
                logger_1.log.warn('[InternetBridge] Tavily search failed', {
                    error: error.message
                });
            }
        }
        // Fallback to Perplexity
        if (this.perplexityApiKey) {
            try {
                return await this.searchWithPerplexity(query, maxResults);
            }
            catch (error) {
                logger_1.log.warn('[InternetBridge] Perplexity search failed', {
                    error: error.message
                });
            }
        }
        // No APIs available
        logger_1.log.warn('[InternetBridge] No search APIs configured');
        return [];
    }
    /**
     * Search with Tavily API
     */
    async searchWithTavily(query, maxResults) {
        const response = await axios_1.default.post('https://api.tavily.com/search', {
            api_key: this.tavilyApiKey,
            query,
            max_results: maxResults,
            include_answer: true,
            include_raw_content: false
        });
        const results = [];
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
        logger_1.log.info('[InternetBridge] Tavily search complete', {
            resultsCount: results.length
        });
        return results;
    }
    /**
     * Search with Perplexity API
     */
    async searchWithPerplexity(query, maxResults) {
        const response = await axios_1.default.post('https://api.perplexity.ai/chat/completions', {
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
        }, {
            headers: {
                'Authorization': `Bearer ${this.perplexityApiKey}`,
                'Content-Type': 'application/json'
            }
        });
        const answer = response.data.choices[0]?.message?.content || '';
        const citations = response.data.citations || [];
        const results = [];
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
        logger_1.log.info('[InternetBridge] Perplexity search complete', {
            resultsCount: results.length
        });
        return results;
    }
    /**
     * Fetch and parse documentation from URL
     */
    async fetchDocs(url) {
        try {
            logger_1.log.info('[InternetBridge] Fetching docs', { url });
            const response = await axios_1.default.get(url, {
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
            logger_1.log.info('[InternetBridge] Docs fetched', {
                url,
                length: content.length
            });
            return content.substring(0, 10000); // Limit to 10k chars
        }
        catch (error) {
            logger_1.log.error('[InternetBridge] Failed to fetch docs', {
                url,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Search for code examples on GitHub
     */
    async searchGitHub(query, language) {
        try {
            logger_1.log.info('[InternetBridge] Searching GitHub', { query, language });
            const searchQuery = language ? `${query} language:${language}` : query;
            const response = await axios_1.default.get(`https://api.github.com/search/code`, {
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
            });
            const results = [];
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
            logger_1.log.info('[InternetBridge] GitHub search complete', {
                resultsCount: results.length
            });
            return results;
        }
        catch (error) {
            logger_1.log.error('[InternetBridge] GitHub search failed', {
                error: error.message
            });
            return [];
        }
    }
}
exports.InternetBridge = InternetBridge;
// Export singleton
let internetBridgeInstance = null;
function getInternetBridge() {
    if (!internetBridgeInstance) {
        internetBridgeInstance = new InternetBridge();
    }
    return internetBridgeInstance;
}

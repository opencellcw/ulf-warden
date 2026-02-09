/**
 * Rate Limit Configuration
 *
 * Defines rate limits for different endpoints and tool categories.
 * Prevents abuse of expensive APIs (Replicate, OpenAI, etc).
 */

import { EndpointRateLimits, RateLimitRule } from './rate-limiter-enhanced';

/**
 * Tool Category Rate Limits
 *
 * Different limits based on cost/resource usage:
 * - AI Generation (most expensive): 10/hour
 * - Web Hosting: 20/hour
 * - API calls: 60/hour
 * - File operations: 120/hour
 * - Read-only: unlimited (respects default)
 */

// AI Generation Tools (Replicate, OpenAI, ElevenLabs)
const AI_GENERATION_LIMIT: RateLimitRule = {
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
  message: 'AI generation rate limit exceeded. Limit: 10 requests per hour.'
};

// Web Hosting (deploy, list, delete)
const WEB_HOSTING_LIMIT: RateLimitRule = {
  maxRequests: 20,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 10 * 60 * 1000, // Block for 10 minutes
  message: 'Web hosting rate limit exceeded. Limit: 20 operations per hour.'
};

// External API calls (GitHub, web fetch)
const EXTERNAL_API_LIMIT: RateLimitRule = {
  maxRequests: 60,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
  message: 'External API rate limit exceeded. Limit: 60 requests per hour.'
};

// File Write Operations
const FILE_WRITE_LIMIT: RateLimitRule = {
  maxRequests: 120,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 2 * 60 * 1000, // Block for 2 minutes
  message: 'File write rate limit exceeded. Limit: 120 operations per hour.'
};

// Shell/Process Commands
const SHELL_LIMIT: RateLimitRule = {
  maxRequests: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
  message: 'Shell command rate limit exceeded. Limit: 100 commands per hour.'
};

/**
 * Endpoint-specific rate limits
 *
 * Maps tool names/endpoints to their rate limit rules.
 * Uses pattern matching for flexibility.
 */
export const TOOL_RATE_LIMITS: EndpointRateLimits = {
  // ====================================
  // AI GENERATION TOOLS (10/hour)
  // ====================================
  'replicate_generate_image': AI_GENERATION_LIMIT,
  'replicate_generate_video': AI_GENERATION_LIMIT,
  'replicate_run_model': AI_GENERATION_LIMIT,
  'replicate_upscale_image': AI_GENERATION_LIMIT,
  'replicate_remove_background': AI_GENERATION_LIMIT,
  'replicate_*': AI_GENERATION_LIMIT, // Catch-all for Replicate

  'openai_generate_image': AI_GENERATION_LIMIT,
  'openai_gpt_chat': AI_GENERATION_LIMIT,
  'openai_transcribe_audio': AI_GENERATION_LIMIT,
  'openai_analyze_image': AI_GENERATION_LIMIT,
  'openai_*': AI_GENERATION_LIMIT, // Catch-all for OpenAI

  'elevenlabs_text_to_speech': AI_GENERATION_LIMIT,
  'elevenlabs_*': AI_GENERATION_LIMIT, // Catch-all for ElevenLabs

  // ====================================
  // WEB HOSTING (20/hour)
  // ====================================
  'deploy_public_app': WEB_HOSTING_LIMIT,
  'list_public_apps': WEB_HOSTING_LIMIT,
  'delete_public_app': WEB_HOSTING_LIMIT,

  // ====================================
  // EXTERNAL APIs (60/hour)
  // ====================================
  'web_fetch': EXTERNAL_API_LIMIT,
  'web_extract': EXTERNAL_API_LIMIT,
  'web_*': EXTERNAL_API_LIMIT,

  'brave_web_search': EXTERNAL_API_LIMIT,
  'brave_news_search': EXTERNAL_API_LIMIT,
  'brave_*': EXTERNAL_API_LIMIT,

  'browser_navigate': EXTERNAL_API_LIMIT,
  'browser_screenshot': EXTERNAL_API_LIMIT,
  'browser_get_content': EXTERNAL_API_LIMIT,
  'browser_click': EXTERNAL_API_LIMIT,
  'browser_fill_form': EXTERNAL_API_LIMIT,
  'browser_execute_js': EXTERNAL_API_LIMIT,
  'browser_wait_for': EXTERNAL_API_LIMIT,
  'browser_close': EXTERNAL_API_LIMIT,
  'browser_*': EXTERNAL_API_LIMIT,

  'github_clone': EXTERNAL_API_LIMIT,
  'github_search': EXTERNAL_API_LIMIT,
  'github_issue': EXTERNAL_API_LIMIT,
  'github_pr': EXTERNAL_API_LIMIT,
  'github_*': EXTERNAL_API_LIMIT,

  // ====================================
  // FILE WRITES (120/hour)
  // ====================================
  'write_file': FILE_WRITE_LIMIT,
  'file_backup': FILE_WRITE_LIMIT,

  // ====================================
  // SHELL/PROCESS (100/hour)
  // ====================================
  'execute_shell': SHELL_LIMIT,
  'process_start': SHELL_LIMIT,
  'process_restart': SHELL_LIMIT,

  // ====================================
  // READ-ONLY OPERATIONS
  // ====================================
  // These use the default limit (more lenient)
  // read_file, list_directory, get_processes, etc.
};

/**
 * Default rate limit for unspecified endpoints
 * Applied to: read operations, low-cost tools
 */
export const DEFAULT_RATE_LIMIT: RateLimitRule = {
  maxRequests: 200,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 1000, // Block for 1 minute
  message: 'Rate limit exceeded. Limit: 200 requests per hour.'
};

/**
 * Admin user multiplier
 * Admins get 5x the normal limit
 */
export const ADMIN_MULTIPLIER = 5;

/**
 * Parse admin user IDs from environment
 */
export function getAdminUsers(): Set<string> {
  const adminUsers = new Set<string>();

  // Discord admins (from DISCORD_ADMIN_USER_IDS)
  if (process.env.DISCORD_ADMIN_USER_IDS) {
    const discordAdmins = process.env.DISCORD_ADMIN_USER_IDS.split(',').map(id => id.trim());
    discordAdmins.forEach(id => adminUsers.add(`discord:${id}`));
  }

  // Rate limit specific admins (new env var)
  if (process.env.RATE_LIMIT_ADMIN_USERS) {
    const rateLimitAdmins = process.env.RATE_LIMIT_ADMIN_USERS.split(',').map(id => id.trim());
    rateLimitAdmins.forEach(id => adminUsers.add(id));
  }

  return adminUsers;
}

/**
 * Rate limit summary for documentation
 */
export const RATE_LIMIT_SUMMARY = {
  'AI Generation (Replicate, OpenAI, ElevenLabs)': '10/hour',
  'Web Hosting (deploy, delete)': '20/hour',
  'External APIs (GitHub, web fetch)': '60/hour',
  'File Writes': '120/hour',
  'Shell Commands': '100/hour',
  'Read Operations (default)': '200/hour',
  'Admin Multiplier': '5x',
};

/**
 * Tool Blocklist Configuration
 *
 * Inspired by OpenClaw-Security's security model
 * https://github.com/cloudwalk/openclaw-security
 *
 * This file defines which tools are blocked by default for security.
 * Tools can be unblocked via environment variable if needed.
 */

import { log } from '../logger';

/**
 * Dangerous tools that are blocked by default
 *
 * These tools pose security risks:
 * - SSRF (Server-Side Request Forgery)
 * - DoS (Denial of Service)
 * - Data exfiltration
 * - Privilege escalation
 */
export const DEFAULT_BLOCKED_TOOLS = [
  // Web tools (SSRF risk)
  'web_fetch',           // Can fetch arbitrary URLs (SSRF)
  'web_extract',         // Can scrape any website

  // GitHub tools (Code execution risk)
  'github_clone',        // Can clone arbitrary repos (malicious code)

  // Expensive tools (DoS risk)
  'replicate_generate_image',      // Expensive API calls
  'replicate_generate_video',      // Very expensive
  'replicate_run_model',           // Arbitrary model execution
  'replicate_upscale_image',       // Expensive
  'openai_generate_image',         // Expensive API calls
  'openai_gpt_chat',               // Can call GPT-4 (expensive)

  // Potentially dangerous
  // 'execute_shell',      // Uncomment to block shell execution
  // 'write_file',         // Uncomment to block file writing
];

/**
 * Tools that are always allowed (cannot be blocked)
 *
 * These are essential for basic functionality
 */
export const ALWAYS_ALLOWED_TOOLS = [
  'read_file',           // Reading files is usually safe
  'list_directory',      // Listing is safe
  'get_processes',       // Monitoring is safe
];

/**
 * Get the current list of blocked tools
 *
 * Can be overridden via environment variable:
 * BLOCKED_TOOLS="web_fetch,github_clone,execute_shell"
 */
export function getBlockedTools(): string[] {
  // Check if user provided custom blocklist
  const envBlocklist = process.env.BLOCKED_TOOLS;

  if (envBlocklist) {
    const customBlocked = envBlocklist.split(',').map(t => t.trim()).filter(Boolean);
    log.info('[BlockedTools] Using custom blocklist from environment', {
      count: customBlocked.length,
      tools: customBlocked
    });
    return customBlocked;
  }

  // Use default blocklist
  log.info('[BlockedTools] Using default blocklist', {
    count: DEFAULT_BLOCKED_TOOLS.length
  });

  return DEFAULT_BLOCKED_TOOLS;
}

/**
 * Get the list of allowed tools (inverse of blocked)
 *
 * Can be overridden via environment variable:
 * ALLOWED_TOOLS="execute_shell,write_file,read_file"
 */
export function getAllowedTools(): string[] | null {
  const envAllowlist = process.env.ALLOWED_TOOLS;

  if (envAllowlist) {
    const allowedTools = envAllowlist.split(',').map(t => t.trim()).filter(Boolean);
    log.info('[BlockedTools] Using allowlist mode from environment', {
      count: allowedTools.length,
      tools: allowedTools
    });
    return allowedTools;
  }

  return null; // No allowlist, use blocklist instead
}

/**
 * Check if a tool is blocked
 *
 * Returns:
 * - true: Tool is blocked
 * - false: Tool is allowed
 */
export function isToolBlocked(toolName: string): boolean {
  // Always allowed tools cannot be blocked
  if (ALWAYS_ALLOWED_TOOLS.includes(toolName)) {
    return false;
  }

  // If allowlist mode is active, block everything not in allowlist
  const allowlist = getAllowedTools();
  if (allowlist) {
    return !allowlist.includes(toolName);
  }

  // Otherwise use blocklist
  const blocklist = getBlockedTools();
  return blocklist.includes(toolName);
}

/**
 * Get security info about a tool
 */
export function getToolSecurityInfo(toolName: string): {
  blocked: boolean;
  reason?: string;
} {
  if (ALWAYS_ALLOWED_TOOLS.includes(toolName)) {
    return { blocked: false };
  }

  const allowlist = getAllowedTools();
  if (allowlist) {
    if (allowlist.includes(toolName)) {
      return { blocked: false };
    }
    return {
      blocked: true,
      reason: 'Not in allowlist (ALLOWED_TOOLS environment variable)'
    };
  }

  const blocklist = getBlockedTools();
  if (blocklist.includes(toolName)) {
    const reasons: Record<string, string> = {
      'web_fetch': 'SSRF risk (can access internal networks)',
      'web_extract': 'Arbitrary web scraping',
      'github_clone': 'Can clone malicious repositories',
      'replicate_generate_image': 'Expensive API calls (DoS risk)',
      'replicate_generate_video': 'Very expensive API calls',
      'openai_generate_image': 'Expensive API calls (DoS risk)',
    };

    return {
      blocked: true,
      reason: reasons[toolName] || 'Blocked by security policy'
    };
  }

  return { blocked: false };
}

/**
 * Log blocked tool attempt
 */
export function logBlockedToolAttempt(
  toolName: string,
  userId: string,
  reason: string
): void {
  log.warn('[BlockedTools] Tool execution blocked', {
    tool: toolName,
    userId: userId.substring(0, 12) + '...',
    reason
  });
}

/**
 * Initialize and log blocklist status
 */
export function initializeBlocklist(): void {
  const allowlist = getAllowedTools();
  const blocklist = getBlockedTools();

  if (allowlist) {
    log.info('[BlockedTools] Initialized in ALLOWLIST mode', {
      allowed: allowlist.length,
      tools: allowlist
    });
  } else {
    log.info('[BlockedTools] Initialized in BLOCKLIST mode', {
      blocked: blocklist.length,
      alwaysAllowed: ALWAYS_ALLOWED_TOOLS.length
    });
  }

  // Log security notice
  log.info('[BlockedTools] Security notice', {
    mode: allowlist ? 'allowlist' : 'blocklist',
    info: 'Configure via BLOCKED_TOOLS or ALLOWED_TOOLS environment variable'
  });
}

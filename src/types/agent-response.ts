/**
 * Agent Response Types
 *
 * Defines how the bot should respond to a message:
 * - reply: Send a text response
 * - react: React with emoji
 * - no_reply: Do nothing (silent)
 */

export type ResponseType = 'reply' | 'react' | 'no_reply';

export interface AgentResponseDecision {
  type: ResponseType;
  content?: string;        // Text response (for 'reply')
  emoji?: string;          // Emoji to react with (for 'react')
  reason?: string;         // Debug info: why this decision was made
}

/**
 * Parse agent response to determine action
 *
 * Expected formats:
 * - REACT:😂         → React with 😂
 * - REACT:👀         → React with 👀
 * - NO_REPLY         → Do nothing
 * - [any other text] → Reply with text
 */
export function parseAgentResponse(response: string): AgentResponseDecision {
  const trimmed = response.trim();

  // Check for REACT: prefix
  if (trimmed.startsWith('REACT:')) {
    const emoji = trimmed.substring(6).trim();
    return {
      type: 'react',
      emoji,
      reason: 'Agent requested reaction'
    };
  }

  // Check for NO_REPLY
  if (trimmed === 'NO_REPLY' || trimmed === 'HEARTBEAT_OK') {
    return {
      type: 'no_reply',
      reason: 'Agent decided not to respond'
    };
  }

  // Default: reply with text
  return {
    type: 'reply',
    content: response,
    reason: 'Standard text response'
  };
}

/**
 * Common emoji shortcuts for reactions
 */
export const REACTION_EMOJIS = {
  // Acknowledgment
  ok: '👍',
  check: '✅',
  eyes: '👀',

  // Humor
  laugh: '😂',
  rofl: '🤣',
  grin: '😁',

  // Interest/Appreciation
  fire: '🔥',
  star: '⭐',
  heart: '❤️',
  sparkles: '✨',

  // Thinking/Processing
  think: '🤔',
  brain: '🧠',

  // Misc
  wave: '👋',
  clap: '👏',
  rocket: '🚀'
} as const;

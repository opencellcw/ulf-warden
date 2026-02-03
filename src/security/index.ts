/**
 * Security Integration Layer
 *
 * Exports all security components:
 * - Sanitizer: Content firewall for external data
 * - Vetter: Tool execution gate
 * - Self-Defense: Rate limiting and attack detection
 */

export {
  sanitizeContent,
  requiresSanitization,
  formatForAgent,
  type SanitizedContent
} from './sanitizer';

export {
  vetToolCall,
  isInAllowlist,
  isInDenylist,
  validateToolArgs,
  formatConfirmationPrompt,
  type VetDecision
} from './vetter';

export {
  SelfDefenseSystem,
  selfDefenseSystem,
  type ThreatDetection
} from './self-defense';

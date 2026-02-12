/**
 * RoundTable Multi-Agent System - Type Definitions
 * 
 * Based on "RoundTable: Investigating Group Decision-Making in Multi-Agent Collaboration"
 * Implements deliberative multi-agent decision making with 3 phases:
 * 1. Message Phase - Open discussion
 * 2. Proposal Phase - Formal solutions
 * 3. Voting Phase - Democratic decision
 */

export type VotingRule = 'majority' | 'unanimity' | 'rated' | 'ranked';
export type SessionPhase = 'message' | 'proposal' | 'voting' | 'complete';

/**
 * Agent Persona Definition
 */
export interface AgentPersona {
  id: string;
  name: string;
  systemPrompt: string;
  temperature: number;
  tools: string[];
  role: string;
  emoji: string;
}

/**
 * Round Message (Phase 1)
 */
export interface RoundMessage {
  agentId: string;
  content: string;
  timestamp: number;
  round: number;
}

/**
 * Formal Proposal (Phase 2)
 */
export interface Proposal {
  id: string;
  agentId: string;
  title: string;
  description: string;
  benefits: string[];
  steps: string[];
  timestamp: number;
}

/**
 * Vote (Phase 3)
 */
export interface Vote {
  agentId: string;
  proposalId?: string; // For majority/unanimity
  rating?: number; // 1-5 for rated voting
  ranking?: string[]; // Ordered list of proposal IDs for ranked voting
  justification: string;
}

/**
 * RoundTable Configuration
 */
export interface RoundTableConfig {
  topic: string;
  maxRounds: number;
  votingRule: VotingRule;
  agents: AgentPersona[];
  userId: string;
  autoStop?: boolean; // Stop early if consensus reached
  showThinking?: boolean; // Show agent discussion to user
}

/**
 * RoundTable Session
 */
export interface RoundTableSession {
  id: string;
  topic: string;
  round: number;
  maxRounds: number;
  phase: SessionPhase;
  votingRule: VotingRule;
  agents: AgentPersona[];
  messages: RoundMessage[];
  proposals: Proposal[];
  votes: Vote[];
  winner?: Proposal;
  createdAt: number;
  completedAt?: number;
  userId: string;
}

/**
 * RoundTable Result
 */
export interface RoundTableResult {
  session: RoundTableSession;
  winner: Proposal;
  votes: Vote[];
  totalRounds: number;
  discussionSummary: string;
  consensusScore: number; // 0-1, how much agreement there was
  participationStats: {
    agentId: string;
    messagesCount: number;
    proposalQuality: number;
  }[];
}

/**
 * Vote Aggregation Result
 */
export interface VoteAggregation {
  winner: Proposal;
  scores: Record<string, number>; // proposalId -> score
  consensusScore: number;
  tieBreaker?: boolean;
}

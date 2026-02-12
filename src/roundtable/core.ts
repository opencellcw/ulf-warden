import { v4 as uuidv4 } from 'uuid';
import {
  RoundTableSession,
  RoundTableConfig,
  RoundTableResult,
  Proposal,
  Vote,
  VoteAggregation,
  SessionPhase
} from './types';
import { runMessagePhase } from './phases/message-phase';
import { runProposalPhase } from './phases/proposal-phase';
import { runVotingPhase } from './phases/voting-phase';
import { LLMProvider } from '../llm/interface';
import { log } from '../logger';

/**
 * RoundTable Orchestrator
 * 
 * Manages the multi-agent deliberation process:
 * 1. Message Phase - Open discussion
 * 2. Proposal Phase - Formal solutions
 * 3. Voting Phase - Democratic decision
 */
export class RoundTableOrchestrator {
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * Create a new RoundTable session
   */
  createSession(config: RoundTableConfig): RoundTableSession {
    const session: RoundTableSession = {
      id: uuidv4(),
      topic: config.topic,
      round: 1,
      maxRounds: config.maxRounds,
      phase: 'message',
      votingRule: config.votingRule,
      agents: config.agents,
      messages: [],
      proposals: [],
      votes: [],
      createdAt: Date.now(),
      userId: config.userId
    };

    log.info('[RoundTable] Session created', {
      sessionId: session.id,
      topic: config.topic,
      agents: config.agents.map(a => a.name),
      votingRule: config.votingRule
    });

    return session;
  }

  /**
   * Run full RoundTable deliberation
   */
  async run(config: RoundTableConfig): Promise<RoundTableResult> {
    const session = this.createSession(config);

    try {
      // Run discussion rounds (Message Phase)
      for (let round = 1; round <= config.maxRounds; round++) {
        session.round = round;
        session.phase = 'message';

        log.info('[RoundTable] Starting round', {
          sessionId: session.id,
          round,
          maxRounds: config.maxRounds
        });

        const messages = await runMessagePhase(session, this.llmProvider);
        session.messages.push(...messages);

        // Early stopping if consensus seems reached
        if (config.autoStop && await this.hasConsensus(session)) {
          log.info('[RoundTable] Early consensus detected', {
            sessionId: session.id,
            round
          });
          break;
        }
      }

      // Proposal Phase
      session.phase = 'proposal';
      log.info('[RoundTable] Starting proposal phase', {
        sessionId: session.id
      });

      const proposals = await runProposalPhase(session, this.llmProvider);
      session.proposals = proposals;

      // Voting Phase
      session.phase = 'voting';
      log.info('[RoundTable] Starting voting phase', {
        sessionId: session.id,
        proposalCount: proposals.length,
        votingRule: session.votingRule
      });

      const { winner, votes } = await runVotingPhase(
        session,
        session.votingRule,
        this.llmProvider
      );

      session.votes = votes;
      session.winner = winner;
      session.phase = 'complete';
      session.completedAt = Date.now();

      log.info('[RoundTable] Session complete', {
        sessionId: session.id,
        winner: winner.title,
        totalRounds: session.round
      });

      // Build result
      return this.buildResult(session);
    } catch (error: any) {
      log.error('[RoundTable] Session failed', {
        sessionId: session.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Run single round (for step-by-step execution)
   */
  async runRound(session: RoundTableSession): Promise<RoundTableSession> {
    switch (session.phase) {
      case 'message':
        const messages = await runMessagePhase(session, this.llmProvider);
        session.messages.push(...messages);
        
        // Progress to next round or next phase
        if (session.round < session.maxRounds) {
          session.round++;
        } else {
          session.phase = 'proposal';
        }
        break;

      case 'proposal':
        const proposals = await runProposalPhase(session, this.llmProvider);
        session.proposals = proposals;
        session.phase = 'voting';
        break;

      case 'voting':
        const { winner, votes } = await runVotingPhase(
          session,
          session.votingRule,
          this.llmProvider
        );
        session.votes = votes;
        session.winner = winner;
        session.phase = 'complete';
        session.completedAt = Date.now();
        break;

      case 'complete':
        // Already complete
        break;
    }

    return session;
  }

  /**
   * Check if agents have reached consensus early
   */
  private async hasConsensus(session: RoundTableSession): Promise<boolean> {
    // Simple heuristic: check if recent messages are converging
    // This can be made more sophisticated with sentiment analysis
    
    const recentMessages = session.messages.slice(-session.agents.length);
    if (recentMessages.length < session.agents.length) {
      return false;
    }

    // Count agreement keywords
    const agreementKeywords = ['agree', 'consensus', 'aligned', 'support', 'concur'];
    const agreementCount = recentMessages.filter(msg => 
      agreementKeywords.some(keyword => msg.content.toLowerCase().includes(keyword))
    ).length;

    // If majority are using agreement language, likely consensus
    return agreementCount >= Math.ceil(session.agents.length / 2);
  }

  /**
   * Build final result with statistics
   */
  private buildResult(session: RoundTableSession): RoundTableResult {
    if (!session.winner) {
      throw new Error('Session not complete - no winner');
    }

    // Calculate consensus score
    const consensusScore = this.calculateConsensusScore(session);

    // Build participation stats
    const participationStats = session.agents.map(agent => ({
      agentId: agent.id,
      messagesCount: session.messages.filter(m => m.agentId === agent.id).length,
      proposalQuality: this.rateProposal(
        session.proposals.find(p => p.agentId === agent.id)
      )
    }));

    // Generate discussion summary
    const discussionSummary = this.summarizeDiscussion(session);

    return {
      session,
      winner: session.winner,
      votes: session.votes,
      totalRounds: session.round,
      discussionSummary,
      consensusScore,
      participationStats
    };
  }

  /**
   * Calculate consensus score (0-1)
   */
  private calculateConsensusScore(session: RoundTableSession): number {
    if (!session.winner || session.votes.length === 0) {
      return 0;
    }

    // Count votes for winner
    const winnerVotes = session.votes.filter(v => 
      v.proposalId === session.winner!.id ||
      (v.rating && v.rating >= 4) ||
      (v.ranking && v.ranking[0] === session.winner!.id)
    ).length;

    return winnerVotes / session.votes.length;
  }

  /**
   * Rate proposal quality (0-1)
   */
  private rateProposal(proposal?: Proposal): number {
    if (!proposal) return 0;

    let score = 0.5; // Base score

    // Longer description = more thought
    if (proposal.description.length > 200) score += 0.1;
    if (proposal.description.length > 500) score += 0.1;

    // More benefits = more comprehensive
    if (proposal.benefits.length >= 3) score += 0.1;
    if (proposal.benefits.length >= 5) score += 0.1;

    // More implementation steps = more practical
    if (proposal.steps.length >= 3) score += 0.1;
    if (proposal.steps.length >= 5) score += 0.1;

    return Math.min(score, 1);
  }

  /**
   * Summarize discussion for user
   */
  private summarizeDiscussion(session: RoundTableSession): string {
    const lines: string[] = [];

    // Key points from each agent
    const agentContributions = session.agents.map(agent => {
      const agentMessages = session.messages
        .filter(m => m.agentId === agent.id)
        .slice(-2); // Last 2 messages

      if (agentMessages.length === 0) return '';

      const summary = agentMessages
        .map(m => m.content.substring(0, 150))
        .join(' ');

      return `${agent.emoji} **${agent.name}**: ${summary}`;
    }).filter(Boolean);

    lines.push('**Key Discussion Points:**\n');
    lines.push(...agentContributions);
    lines.push('');

    // Voting summary
    lines.push('**Voting Results:**');
    const voteDistribution = this.getVoteDistribution(session);
    lines.push(voteDistribution);

    return lines.join('\n');
  }

  /**
   * Get vote distribution as string
   */
  private getVoteDistribution(session: RoundTableSession): string {
    const counts: Record<string, number> = {};
    
    session.votes.forEach(vote => {
      if (vote.proposalId) {
        counts[vote.proposalId] = (counts[vote.proposalId] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([proposalId, count]) => {
        const proposal = session.proposals.find(p => p.id === proposalId);
        const percentage = Math.round((count / session.votes.length) * 100);
        return `- ${proposal?.title || proposalId}: ${count} votes (${percentage}%)`;
      })
      .join('\n');
  }

  /**
   * Get session status
   */
  getStatus(session: RoundTableSession): {
    phase: SessionPhase;
    round: number;
    maxRounds: number;
    messagesCount: number;
    proposalsCount: number;
    votesCount: number;
    isComplete: boolean;
  } {
    return {
      phase: session.phase,
      round: session.round,
      maxRounds: session.maxRounds,
      messagesCount: session.messages.length,
      proposalsCount: session.proposals.length,
      votesCount: session.votes.length,
      isComplete: session.phase === 'complete'
    };
  }
}

/**
 * Singleton factory
 */
let orchestrator: RoundTableOrchestrator | null = null;

export function getRoundTableOrchestrator(llmProvider: LLMProvider): RoundTableOrchestrator {
  if (!orchestrator) {
    orchestrator = new RoundTableOrchestrator(llmProvider);
  }
  return orchestrator;
}

import { RoundTableSession, Vote, Proposal, VotingRule, VoteAggregation } from '../types';
import { LLMProvider, LLMMessage } from '../../llm/interface';
import { log } from '../../logger';

/**
 * Voting Phase - Democratic Decision
 * 
 * Agents vote on proposals using one of four social choice methods:
 * 1. Majority - Each agent picks one proposal
 * 2. Unanimity - Must have 100% agreement
 * 3. Rated - Agents rate all proposals 1-5
 * 4. Ranked - Agents rank proposals (Borda count)
 */

/**
 * Run voting phase
 */
export async function runVotingPhase(
  session: RoundTableSession,
  rule: VotingRule,
  llmProvider: LLMProvider
): Promise<{ winner: Proposal; votes: Vote[] }> {
  log.info('[VotingPhase] Starting', {
    sessionId: session.id,
    rule,
    proposalCount: session.proposals.length
  });

  // Collect votes from all agents
  const votes: Vote[] = await Promise.all(
    session.agents.map(async (agent) => {
      try {
        return await collectVote(agent.id, session, rule, llmProvider);
      } catch (error: any) {
        log.error('[VotingPhase] Vote collection failed', {
          agentId: agent.id,
          error: error.message
        });
        
        // Return abstain vote
        return {
          agentId: agent.id,
          justification: 'Technical difficulties prevented voting'
        };
      }
    })
  );

  // Aggregate votes using selected rule
  const aggregation = aggregateVotes(votes, session.proposals, rule);

  log.info('[VotingPhase] Complete', {
    sessionId: session.id,
    winner: aggregation.winner.title,
    consensusScore: aggregation.consensusScore
  });

  return {
    winner: aggregation.winner,
    votes
  };
}

/**
 * Collect vote from single agent
 */
async function collectVote(
  agentId: string,
  session: RoundTableSession,
  rule: VotingRule,
  llmProvider: LLMProvider
): Promise<Vote> {
  const agent = session.agents.find(a => a.id === agentId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  const prompt = buildVotingPrompt(agent.id, session, rule);

  const llmMessages: LLMMessage[] = [
    { role: 'system', content: agent.systemPrompt },
    { role: 'user', content: prompt }
  ];

  const response = await llmProvider.generate(llmMessages, {
    maxTokens: 300,
    temperature: 0.3 // Lower temperature for voting (more consistent)
  });

  return parseVote(response.content, agentId, session, rule);
}

/**
 * Build voting prompt based on rule
 */
function buildVotingPrompt(agentId: string, session: RoundTableSession, rule: VotingRule): string {
  const agent = session.agents.find(a => a.id === agentId)!;
  
  let prompt = `Now it's time to vote on the proposals.

**Topic**: ${session.topic}

**Proposals**:
`;

  // List all proposals
  session.proposals.forEach((prop, idx) => {
    const propAgent = session.agents.find(a => a.id === prop.agentId);
    prompt += `
**Proposal ${idx + 1}** by ${propAgent?.name || prop.agentId}:
Title: ${prop.title}
Description: ${prop.description.substring(0, 300)}...
Benefits: ${prop.benefits.slice(0, 3).join(', ')}
`;
  });

  prompt += '\n\n';

  // Instructions based on voting rule
  switch (rule) {
    case 'majority':
      prompt += `**Voting Rule: Majority**

Vote for ONE proposal that you think is the best solution.

Format your vote as:
VOTE: [Proposal number 1-${session.proposals.length}]
JUSTIFICATION: [Brief explanation why you chose this proposal]

Example:
VOTE: 2
JUSTIFICATION: This proposal balances practicality with innovation...

Your vote:`;
      break;

    case 'rated':
      prompt += `**Voting Rule: Rated**

Rate EACH proposal from 1-5 stars:
- 5 stars: Excellent solution
- 4 stars: Good solution
- 3 stars: Acceptable solution
- 2 stars: Weak solution
- 1 star: Poor solution

Format your ratings as:
RATINGS:
Proposal 1: [1-5]
Proposal 2: [1-5]
...
JUSTIFICATION: [Brief explanation of your ratings]

Your ratings:`;
      break;

    case 'ranked':
      prompt += `**Voting Rule: Ranked**

Rank ALL proposals from best to worst.

Format your ranking as:
RANKING:
1st: Proposal [number]
2nd: Proposal [number]
3rd: Proposal [number]
...
JUSTIFICATION: [Brief explanation of your ranking]

Your ranking:`;
      break;

    case 'unanimity':
      prompt += `**Voting Rule: Unanimity**

Vote for ONE proposal. NOTE: All agents must agree on the same proposal for it to win.

Format your vote as:
VOTE: [Proposal number 1-${session.proposals.length}]
JUSTIFICATION: [Brief explanation why you chose this proposal]

Your vote:`;
      break;
  }

  return prompt;
}

/**
 * Parse vote from LLM response
 */
function parseVote(response: string, agentId: string, session: RoundTableSession, rule: VotingRule): Vote {
  const lines = response.split('\n').map(l => l.trim());

  let proposalId: string | undefined;
  let rating: number | undefined;
  let ranking: string[] | undefined;
  let justification = '';

  // Extract justification (usually at the end)
  const justLine = lines.find(l => l.startsWith('JUSTIFICATION:'));
  if (justLine) {
    justification = justLine.replace('JUSTIFICATION:', '').trim();
  }

  switch (rule) {
    case 'majority':
    case 'unanimity':
      // Find VOTE: line
      const voteLine = lines.find(l => l.startsWith('VOTE:'));
      if (voteLine) {
        const voteMatch = voteLine.match(/VOTE:\s*(\d+)/);
        if (voteMatch) {
          const proposalIndex = parseInt(voteMatch[1]) - 1;
          if (proposalIndex >= 0 && proposalIndex < session.proposals.length) {
            proposalId = session.proposals[proposalIndex].id;
          }
        }
      }
      break;

    case 'rated':
      // Parse ratings for each proposal
      // We'll use the first rated proposal as the primary vote
      const ratings: Record<string, number> = {};
      let highestRating = 0;
      let highestProposalId = '';

      session.proposals.forEach((prop, idx) => {
        const ratingLine = lines.find(l => 
          l.match(new RegExp(`Proposal\\s+${idx + 1}:\\s*(\\d)`, 'i'))
        );
        
        if (ratingLine) {
          const ratingMatch = ratingLine.match(/(\d)/);
          if (ratingMatch) {
            const r = parseInt(ratingMatch[1]);
            ratings[prop.id] = r;
            if (r > highestRating) {
              highestRating = r;
              highestProposalId = prop.id;
            }
          }
        }
      });

      if (highestProposalId) {
        proposalId = highestProposalId;
        rating = highestRating;
      }
      break;

    case 'ranked':
      // Parse ranking
      ranking = [];
      const rankLines = lines.filter(l => l.match(/^\d+(st|nd|rd|th):/i));
      
      rankLines.forEach(line => {
        const match = line.match(/Proposal\s+(\d+)/i);
        if (match) {
          const proposalIndex = parseInt(match[1]) - 1;
          if (proposalIndex >= 0 && proposalIndex < session.proposals.length) {
            ranking!.push(session.proposals[proposalIndex].id);
          }
        }
      });

      if (ranking.length > 0) {
        proposalId = ranking[0]; // Top ranked
      }
      break;
  }

  // Fallback: vote for first proposal if parsing failed
  if (!proposalId && session.proposals.length > 0) {
    proposalId = session.proposals[0].id;
    justification = justification || 'Default vote due to parsing issue';
  }

  return {
    agentId,
    proposalId,
    rating,
    ranking,
    justification
  };
}

/**
 * Aggregate votes using selected rule
 */
function aggregateVotes(
  votes: Vote[],
  proposals: Proposal[],
  rule: VotingRule
): VoteAggregation {
  log.debug('[VotingPhase] Aggregating votes', {
    rule,
    voteCount: votes.length,
    proposalCount: proposals.length
  });

  switch (rule) {
    case 'majority':
      return majorityVoting(votes, proposals);
    case 'unanimity':
      return unanimityVoting(votes, proposals);
    case 'rated':
      return ratedVoting(votes, proposals);
    case 'ranked':
      return rankedVoting(votes, proposals);
    default:
      throw new Error(`Unknown voting rule: ${rule}`);
  }
}

/**
 * Majority Voting - Simple plurality
 */
function majorityVoting(votes: Vote[], proposals: Proposal[]): VoteAggregation {
  const counts: Record<string, number> = {};

  votes.forEach(vote => {
    if (vote.proposalId) {
      counts[vote.proposalId] = (counts[vote.proposalId] || 0) + 1;
    }
  });

  // Find proposal with most votes
  let maxVotes = 0;
  let winnerId = '';

  Object.entries(counts).forEach(([proposalId, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      winnerId = proposalId;
    }
  });

  // If tie, use first proposal as tiebreaker
  const tieBreaker = maxVotes > 0 && Object.values(counts).filter(c => c === maxVotes).length > 1;
  if (!winnerId || tieBreaker) {
    winnerId = proposals[0].id;
  }

  const winner = proposals.find(p => p.id === winnerId) || proposals[0];
  const consensusScore = maxVotes / votes.length;

  return {
    winner,
    scores: counts,
    consensusScore,
    tieBreaker
  };
}

/**
 * Unanimity Voting - Requires 100% agreement
 */
function unanimityVoting(votes: Vote[], proposals: Proposal[]): VoteAggregation {
  const counts: Record<string, number> = {};

  votes.forEach(vote => {
    if (vote.proposalId) {
      counts[vote.proposalId] = (counts[vote.proposalId] || 0) + 1;
    }
  });

  // Check for unanimous vote
  const unanimousEntry = Object.entries(counts).find(([_, count]) => count === votes.length);

  if (unanimousEntry) {
    const winner = proposals.find(p => p.id === unanimousEntry[0]) || proposals[0];
    return {
      winner,
      scores: counts,
      consensusScore: 1.0,
      tieBreaker: false
    };
  }

  // No unanimity - fall back to majority
  log.warn('[VotingPhase] Unanimity not reached, falling back to majority');
  return majorityVoting(votes, proposals);
}

/**
 * Rated Voting - Sum of ratings
 */
function ratedVoting(votes: Vote[], proposals: Proposal[]): VoteAggregation {
  const scores: Record<string, number> = {};

  // Initialize scores
  proposals.forEach(p => {
    scores[p.id] = 0;
  });

  // Sum ratings
  votes.forEach(vote => {
    if (vote.proposalId && vote.rating) {
      scores[vote.proposalId] += vote.rating;
    }
  });

  // Find highest rated
  let maxScore = 0;
  let winnerId = '';

  Object.entries(scores).forEach(([proposalId, score]) => {
    if (score > maxScore) {
      maxScore = score;
      winnerId = proposalId;
    }
  });

  const winner = proposals.find(p => p.id === winnerId) || proposals[0];
  const maxPossibleScore = votes.length * 5; // 5 is max rating
  const consensusScore = maxScore / maxPossibleScore;

  return {
    winner,
    scores,
    consensusScore,
    tieBreaker: false
  };
}

/**
 * Ranked Voting - Borda count
 */
function rankedVoting(votes: Vote[], proposals: Proposal[]): VoteAggregation {
  const scores: Record<string, number> = {};
  const n = proposals.length;

  // Initialize scores
  proposals.forEach(p => {
    scores[p.id] = 0;
  });

  // Calculate Borda count
  votes.forEach(vote => {
    if (vote.ranking) {
      vote.ranking.forEach((proposalId, rank) => {
        // 1st place = n points, 2nd = n-1, etc.
        scores[proposalId] = (scores[proposalId] || 0) + (n - rank);
      });
    }
  });

  // Find highest score
  let maxScore = 0;
  let winnerId = '';

  Object.entries(scores).forEach(([proposalId, score]) => {
    if (score > maxScore) {
      maxScore = score;
      winnerId = proposalId;
    }
  });

  const winner = proposals.find(p => p.id === winnerId) || proposals[0];
  const maxPossibleScore = votes.length * n; // All first place votes
  const consensusScore = maxScore / maxPossibleScore;

  return {
    winner,
    scores,
    consensusScore,
    tieBreaker: false
  };
}

/**
 * Get vote distribution as human-readable string
 */
export function formatVoteDistribution(
  votes: Vote[],
  proposals: Proposal[],
  rule: VotingRule
): string {
  switch (rule) {
    case 'majority':
    case 'unanimity':
      const counts: Record<string, number> = {};
      votes.forEach(v => {
        if (v.proposalId) {
          counts[v.proposalId] = (counts[v.proposalId] || 0) + 1;
        }
      });

      return proposals.map(p => {
        const count = counts[p.id] || 0;
        const percentage = Math.round((count / votes.length) * 100);
        const bars = '█'.repeat(Math.floor(percentage / 10));
        return `${p.title.substring(0, 30)}: ${bars} ${count} (${percentage}%)`;
      }).join('\n');

    case 'rated':
      return proposals.map(p => {
        const ratings = votes.filter(v => v.proposalId === p.id && v.rating);
        const avgRating = ratings.length > 0 
          ? (ratings.reduce((sum, v) => sum + (v.rating || 0), 0) / ratings.length).toFixed(1)
          : '0.0';
        const stars = '⭐'.repeat(Math.round(parseFloat(avgRating)));
        return `${p.title.substring(0, 30)}: ${stars} ${avgRating}/5.0`;
      }).join('\n');

    case 'ranked':
      const scores: Record<string, number> = {};
      const n = proposals.length;
      proposals.forEach(p => scores[p.id] = 0);
      
      votes.forEach(v => {
        if (v.ranking) {
          v.ranking.forEach((pid, rank) => {
            scores[pid] = (scores[pid] || 0) + (n - rank);
          });
        }
      });

      return proposals.map(p => {
        const score = scores[p.id] || 0;
        const maxScore = votes.length * n;
        const percentage = Math.round((score / maxScore) * 100);
        return `${p.title.substring(0, 30)}: ${score} pts (${percentage}%)`;
      }).join('\n');

    default:
      return '[Unknown voting rule]';
  }
}

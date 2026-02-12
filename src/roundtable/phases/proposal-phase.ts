import { v4 as uuidv4 } from 'uuid';
import { RoundTableSession, Proposal, AgentPersona } from '../types';
import { LLMProvider, LLMMessage } from '../../llm/interface';
import { log } from '../../logger';

/**
 * Proposal Phase - Formal Solutions
 * 
 * Each agent proposes a concrete solution based on the discussion.
 * Proposals have structured format: title, description, benefits, steps.
 */

/**
 * Run proposal phase
 */
export async function runProposalPhase(
  session: RoundTableSession,
  llmProvider: LLMProvider
): Promise<Proposal[]> {
  log.info('[ProposalPhase] Starting', {
    sessionId: session.id,
    agentCount: session.agents.length
  });

  // Each agent generates a formal proposal
  const proposals = await Promise.all(
    session.agents.map(async (agent) => {
      try {
        const proposal = await generateProposal(agent, session, llmProvider);
        return proposal;
      } catch (error: any) {
        log.error('[ProposalPhase] Proposal generation failed', {
          agentId: agent.id,
          error: error.message
        });

        // Return fallback proposal
        return createFallbackProposal(agent, session);
      }
    })
  );

  log.info('[ProposalPhase] Complete', {
    sessionId: session.id,
    proposalsGenerated: proposals.length
  });

  return proposals;
}

/**
 * Generate proposal for single agent
 */
async function generateProposal(
  agent: AgentPersona,
  session: RoundTableSession,
  llmProvider: LLMProvider
): Promise<Proposal> {
  const prompt = buildProposalPrompt(agent, session);

  const llmMessages: LLMMessage[] = [
    { role: 'system', content: agent.systemPrompt },
    { role: 'user', content: prompt }
  ];

  const response = await llmProvider.generate(llmMessages, {
    maxTokens: 1000, // Longer for detailed proposals
    temperature: agent.temperature
  });

  const proposal = parseProposal(response.content, agent.id);
  return proposal;
}

/**
 * Build prompt for proposal generation
 */
function buildProposalPrompt(agent: AgentPersona, session: RoundTableSession): string {
  const discussionSummary = summarizeDiscussion(session);

  return `Based on the RoundTable discussion, propose your concrete solution.

**Topic**: ${session.topic}

**Discussion Summary**:
${discussionSummary}

**Your Role**: ${agent.role}

Now, propose your solution using this EXACT format:

TITLE: [One-line summary of your proposal]

DESCRIPTION:
[2-3 paragraphs explaining your solution in detail. Be specific and clear.]

BENEFITS:
- [Benefit 1]
- [Benefit 2]
- [Benefit 3]

STEPS:
1. [Implementation step 1]
2. [Implementation step 2]
3. [Implementation step 3]

**Guidelines**:
- Be specific and actionable
- Address concerns raised in discussion
- Align with your expertise
- Consider practical constraints
- Make it implementable

Write your proposal now:`;
}

/**
 * Parse proposal from LLM response
 */
function parseProposal(response: string, agentId: string): Proposal {
  const lines = response.split('\n').map(l => l.trim());

  let title = '';
  let description = '';
  let benefits: string[] = [];
  let steps: string[] = [];

  let currentSection = '';
  let buffer: string[] = [];

  for (const line of lines) {
    // Section markers
    if (line.startsWith('TITLE:')) {
      title = line.replace('TITLE:', '').trim();
      currentSection = 'title';
      continue;
    }
    if (line.startsWith('DESCRIPTION:')) {
      currentSection = 'description';
      buffer = [];
      continue;
    }
    if (line.startsWith('BENEFITS:')) {
      if (buffer.length > 0) {
        description = buffer.join('\n').trim();
      }
      currentSection = 'benefits';
      buffer = [];
      continue;
    }
    if (line.startsWith('STEPS:')) {
      currentSection = 'steps';
      buffer = [];
      continue;
    }

    // Content lines
    if (currentSection === 'description' && line) {
      buffer.push(line);
    }
    if (currentSection === 'benefits' && line.startsWith('-')) {
      benefits.push(line.replace(/^-\s*/, '').trim());
    }
    if (currentSection === 'steps' && line.match(/^\d+\./)) {
      steps.push(line.replace(/^\d+\.\s*/, '').trim());
    }
  }

  // Finalize description if still in buffer
  if (buffer.length > 0 && currentSection === 'description') {
    description = buffer.join('\n').trim();
  }

  // Fallback values if parsing failed
  if (!title) {
    title = extractFirstSentence(response);
  }
  if (!description) {
    description = response.substring(0, 500);
  }
  if (benefits.length === 0) {
    benefits = ['[Benefit details to be refined]'];
  }
  if (steps.length === 0) {
    steps = ['[Implementation steps to be defined]'];
  }

  return {
    id: uuidv4(),
    agentId,
    title,
    description,
    benefits,
    steps,
    timestamp: Date.now()
  };
}

/**
 * Extract first sentence from text
 */
function extractFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.substring(0, 100);
}

/**
 * Summarize discussion for proposal context
 */
function summarizeDiscussion(session: RoundTableSession): string {
  const recentMessages = session.messages.slice(-15); // Last 15 messages

  const summary = recentMessages.map(msg => {
    const agent = session.agents.find(a => a.id === msg.agentId);
    const agentName = agent ? agent.name : msg.agentId;
    return `- ${agentName}: ${msg.content.substring(0, 150)}`;
  }).join('\n');

  return summary || '[No discussion yet]';
}

/**
 * Create fallback proposal if generation fails
 */
function createFallbackProposal(agent: AgentPersona, session: RoundTableSession): Proposal {
  return {
    id: uuidv4(),
    agentId: agent.id,
    title: `${agent.name}'s Perspective on ${session.topic}`,
    description: `Based on my analysis as ${agent.role}, I propose a balanced approach that considers the key factors discussed in our conversation.`,
    benefits: [
      'Addresses core requirements',
      'Considers practical constraints',
      'Aligns with team expertise'
    ],
    steps: [
      'Conduct detailed analysis',
      'Implement solution incrementally',
      'Monitor and iterate based on feedback'
    ],
    timestamp: Date.now()
  };
}

/**
 * Validate proposal structure
 */
export function validateProposal(proposal: Proposal): boolean {
  return !!(
    proposal.title &&
    proposal.description &&
    proposal.benefits.length > 0 &&
    proposal.steps.length > 0
  );
}

/**
 * Score proposal quality (0-1)
 */
export function scoreProposal(proposal: Proposal): number {
  let score = 0;

  // Title quality
  if (proposal.title.length > 10 && proposal.title.length < 100) score += 0.1;

  // Description quality
  if (proposal.description.length > 100) score += 0.2;
  if (proposal.description.length > 300) score += 0.1;

  // Benefits
  if (proposal.benefits.length >= 3) score += 0.2;
  if (proposal.benefits.length >= 5) score += 0.1;

  // Steps
  if (proposal.steps.length >= 3) score += 0.2;
  if (proposal.steps.length >= 5) score += 0.1;

  // Specificity (check for concrete details)
  const hasNumbers = /\d/.test(proposal.description);
  const hasSpecifics = proposal.description.length > 200;
  if (hasNumbers || hasSpecifics) score += 0.1;

  return Math.min(score, 1);
}

import { RoundTableSession, RoundMessage, AgentPersona } from '../types';
import { LLMProvider, LLMMessage } from '../../llm/interface';
import { log } from '../../logger';

/**
 * Message Phase - Open Discussion
 * 
 * All agents participate simultaneously in open discussion.
 * Each can see all previous messages and respond accordingly.
 */

/**
 * Run message phase for current round
 */
export async function runMessagePhase(
  session: RoundTableSession,
  llmProvider: LLMProvider
): Promise<RoundMessage[]> {
  log.info('[MessagePhase] Starting', {
    sessionId: session.id,
    round: session.round,
    agentCount: session.agents.length
  });

  // All agents send messages SIMULTANEOUSLY (Promise.all)
  const messages = await Promise.all(
    session.agents.map(async (agent) => {
      try {
        const message = await generateAgentMessage(agent, session, llmProvider);
        return message;
      } catch (error: any) {
        log.error('[MessagePhase] Agent message failed', {
          agentId: agent.id,
          error: error.message
        });
        
        // Return fallback message
        return {
          agentId: agent.id,
          content: `[${agent.name} is experiencing technical difficulties]`,
          timestamp: Date.now(),
          round: session.round
        };
      }
    })
  );

  log.info('[MessagePhase] Complete', {
    sessionId: session.id,
    round: session.round,
    messagesGenerated: messages.length
  });

  return messages;
}

/**
 * Generate message for single agent
 */
async function generateAgentMessage(
  agent: AgentPersona,
  session: RoundTableSession,
  llmProvider: LLMProvider
): Promise<RoundMessage> {
  const prompt = buildMessagePrompt(agent, session);

  const llmMessages: LLMMessage[] = [
    { role: 'system', content: agent.systemPrompt },
    { role: 'user', content: prompt }
  ];

  const response = await llmProvider.generate(llmMessages, {
    maxTokens: 500, // Keep messages concise
    temperature: agent.temperature
  });

  return {
    agentId: agent.id,
    content: response.content.trim(),
    timestamp: Date.now(),
    round: session.round
  };
}

/**
 * Build prompt for agent message
 */
function buildMessagePrompt(agent: AgentPersona, session: RoundTableSession): string {
  const isFirstRound = session.round === 1;
  const recentMessages = getRecentMessages(session, 10); // Last 10 messages

  let prompt = `You are participating in a RoundTable discussion.

**Topic**: ${session.topic}

**Current Round**: ${session.round} of ${session.maxRounds}

**Your Role**: ${agent.role}

`;

  // Show previous discussion
  if (recentMessages.length > 0) {
    prompt += `**Discussion so far**:\n`;
    prompt += formatMessages(recentMessages, session);
    prompt += '\n\n';
  }

  // Show previous proposals if any
  if (session.proposals.length > 0) {
    prompt += `**Previous Proposals**:\n`;
    prompt += formatProposals(session.proposals, session);
    prompt += '\n\n';
  }

  // Instructions based on round
  if (isFirstRound) {
    prompt += `This is the first round. Share your initial thoughts and perspective on the topic.

Focus on:
- Your unique viewpoint based on your role
- Key considerations you think are important
- Questions that need to be answered

`;
  } else if (session.round === session.maxRounds) {
    prompt += `This is the FINAL discussion round. The group needs to converge toward a decision.

Focus on:
- Building on the best ideas discussed
- Addressing remaining concerns
- Moving toward consensus

`;
  } else {
    prompt += `Continue the discussion. Respond to previous points and advance the conversation.

You can:
- Respond to specific points made by others
- Ask clarifying questions
- Share new insights
- Challenge or support previous ideas
- Build on promising directions

`;
  }

  prompt += `**Guidelines**:
- Be concise (2-4 sentences max)
- Stay focused on the topic
- Be respectful of other perspectives
- Advance the discussion toward a decision

**Your message**:`;

  return prompt;
}

/**
 * Get recent messages for context
 */
function getRecentMessages(session: RoundTableSession, count: number): RoundMessage[] {
  return session.messages.slice(-count);
}

/**
 * Format messages for display
 */
function formatMessages(messages: RoundMessage[], session: RoundTableSession): string {
  return messages.map(msg => {
    const agent = session.agents.find(a => a.id === msg.agentId);
    const agentName = agent ? `${agent.emoji} ${agent.name}` : msg.agentId;
    return `${agentName}: ${msg.content}`;
  }).join('\n\n');
}

/**
 * Format proposals for display
 */
function formatProposals(proposals: any[], session: RoundTableSession): string {
  return proposals.map((prop, idx) => {
    const agent = session.agents.find(a => a.id === prop.agentId);
    const agentName = agent ? `${agent.emoji} ${agent.name}` : prop.agentId;
    return `${idx + 1}. **${agentName}**: ${prop.title}`;
  }).join('\n');
}

/**
 * Detect if message shows agreement
 */
export function detectsAgreement(message: string): boolean {
  const agreementKeywords = [
    'agree', 'consensus', 'aligned', 'support', 'concur',
    'exactly', 'precisely', 'good point', 'i think so too',
    'makes sense', 'on the same page'
  ];

  const lowerMessage = message.toLowerCase();
  return agreementKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Detect if message shows disagreement
 */
export function detectsDisagreement(message: string): boolean {
  const disagreementKeywords = [
    'disagree', 'however', 'but', 'on the other hand',
    'alternatively', 'concerned', 'issue', 'problem',
    'not sure', 'doubt', 'skeptical'
  ];

  const lowerMessage = message.toLowerCase();
  return disagreementKeywords.some(keyword => lowerMessage.includes(keyword));
}

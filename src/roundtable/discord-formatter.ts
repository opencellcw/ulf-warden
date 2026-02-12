import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { RoundTableResult, RoundTableSession, Proposal } from './types';
import { formatVoteDistribution } from './phases/voting-phase';

/**
 * Discord Formatter for RoundTable Results
 * Creates rich embeds showing the deliberation process and outcome
 */

/**
 * Build main result embed
 */
export function buildRoundTableEmbed(result: RoundTableResult): EmbedBuilder {
  const { session, winner, consensusScore } = result;

  // Determine color based on consensus
  const color = consensusScore > 0.7 ? 0x00FF00 : // Strong consensus - green
                consensusScore > 0.5 ? 0xFFFF00 : // Moderate consensus - yellow
                0xFF0000; // Weak consensus - red

  const embed = new EmbedBuilder()
    .setTitle(`🎯 RoundTable Decision: ${session.topic}`)
    .setDescription(winner.description.substring(0, 400) + (winner.description.length > 400 ? '...' : ''))
    .setColor(color)
    .addFields(
      {
        name: '🏆 Winning Proposal',
        value: `**${winner.title}**\nProposed by: ${getAgentName(winner.agentId, session)}`,
        inline: false
      },
      {
        name: '📊 Voting Details',
        value: `Rule: ${session.votingRule}\nConsensus: ${(consensusScore * 100).toFixed(0)}%\nRounds: ${result.totalRounds}`,
        inline: true
      },
      {
        name: '👥 Participants',
        value: session.agents.map(a => `${a.emoji} ${a.name}`).join('\n'),
        inline: true
      }
    );

  // Add benefits
  if (winner.benefits.length > 0) {
    embed.addFields({
      name: '✅ Key Benefits',
      value: winner.benefits.slice(0, 5).map(b => `• ${b}`).join('\n'),
      inline: false
    });
  }

  // Add implementation steps
  if (winner.steps.length > 0) {
    embed.addFields({
      name: '📝 Implementation Steps',
      value: winner.steps.slice(0, 5).map((s, i) => `${i + 1}. ${s}`).join('\n'),
      inline: false
    });
  }

  // Add vote distribution
  const voteChart = formatVoteDistribution(result.votes, session.proposals, session.votingRule);
  if (voteChart) {
    embed.addFields({
      name: '📈 Vote Distribution',
      value: '```\n' + voteChart.substring(0, 1000) + '\n```',
      inline: false
    });
  }

  // Add timestamp
  embed.setTimestamp(new Date(session.completedAt || Date.now()));
  embed.setFooter({ 
    text: `Session ID: ${session.id.substring(0, 8)} | Powered by RoundTable AI` 
  });

  return embed;
}

/**
 * Build discussion summary embed
 */
export function buildDiscussionEmbed(result: RoundTableResult): EmbedBuilder {
  const { session } = result;

  const embed = new EmbedBuilder()
    .setTitle('💬 Discussion Summary')
    .setDescription('Here\'s what each agent contributed to the discussion:')
    .setColor(0x5865F2);

  // Show key points from each agent
  session.agents.forEach(agent => {
    const agentMessages = session.messages
      .filter(m => m.agentId === agent.id)
      .slice(-2); // Last 2 messages

    if (agentMessages.length > 0) {
      const content = agentMessages
        .map(m => `"${m.content.substring(0, 150)}${m.content.length > 150 ? '...' : ''}"`)
        .join('\n\n');

      embed.addFields({
        name: `${agent.emoji} ${agent.name} - ${agent.role}`,
        value: content || '*No contributions*',
        inline: false
      });
    }
  });

  return embed;
}

/**
 * Build all proposals embed
 */
export function buildProposalsEmbed(session: RoundTableSession): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('📋 All Proposals')
    .setDescription(`Review all ${session.proposals.length} proposals that were considered:`)
    .setColor(0x3498db);

  session.proposals.forEach((proposal, idx) => {
    const agentName = getAgentName(proposal.agentId, session);
    const isWinner = session.winner?.id === proposal.id;

    embed.addFields({
      name: `${isWinner ? '🏆 ' : ''}Proposal ${idx + 1}: ${proposal.title}`,
      value: `**By**: ${agentName}\n${proposal.description.substring(0, 200)}...\n\n**Benefits**: ${proposal.benefits.slice(0, 2).join(', ')}`,
      inline: false
    });
  });

  return embed;
}

/**
 * Build participation stats embed
 */
export function buildStatsEmbed(result: RoundTableResult): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('📊 Participation Statistics')
    .setDescription('Agent contribution metrics:')
    .setColor(0x9b59b6);

  result.participationStats.forEach(stat => {
    const agent = result.session.agents.find(a => a.id === stat.agentId);
    if (agent) {
      const quality = '⭐'.repeat(Math.round(stat.proposalQuality * 5));
      embed.addFields({
        name: `${agent.emoji} ${agent.name}`,
        value: `Messages: ${stat.messagesCount}\nProposal Quality: ${quality}`,
        inline: true
      });
    }
  });

  return embed;
}

/**
 * Build action buttons
 */
export function buildActionButtons(sessionId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`roundtable_discussion_${sessionId}`)
      .setLabel('📜 View Full Discussion')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`roundtable_proposals_${sessionId}`)
      .setLabel('📋 View All Proposals')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`roundtable_stats_${sessionId}`)
      .setLabel('📊 View Statistics')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Build compact summary (for mobile/small screens)
 */
export function buildCompactSummary(result: RoundTableResult): string {
  const { session, winner, consensusScore } = result;

  return `
🎯 **RoundTable Decision**

**Topic**: ${session.topic}

**Winner**: ${winner.title}
*by ${getAgentName(winner.agentId, session)}*

**Consensus**: ${(consensusScore * 100).toFixed(0)}%
**Rounds**: ${result.totalRounds}
**Voting**: ${session.votingRule}

**Benefits**:
${winner.benefits.slice(0, 3).map(b => `• ${b}`).join('\n')}

**Next Steps**:
${winner.steps.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n')}

Type \`!roundtable details ${session.id.substring(0, 8)}\` for full discussion.
`.trim();
}

/**
 * Get agent name from ID
 */
function getAgentName(agentId: string, session: RoundTableSession): string {
  const agent = session.agents.find(a => a.id === agentId);
  return agent ? `${agent.emoji} ${agent.name}` : agentId;
}

/**
 * Format duration
 */
export function formatDuration(startTime: number, endTime: number): string {
  const durationMs = endTime - startTime;
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Build status embed (for in-progress sessions)
 */
export function buildStatusEmbed(session: RoundTableSession): EmbedBuilder {
  const phaseEmoji = {
    message: '💬',
    proposal: '📝',
    voting: '🗳️',
    complete: '✅'
  };

  const embed = new EmbedBuilder()
    .setTitle(`${phaseEmoji[session.phase]} RoundTable In Progress`)
    .setDescription(`**Topic**: ${session.topic}`)
    .setColor(0xf39c12)
    .addFields(
      {
        name: 'Status',
        value: `Phase: ${session.phase}\nRound: ${session.round}/${session.maxRounds}`,
        inline: true
      },
      {
        name: 'Progress',
        value: `Messages: ${session.messages.length}\nProposals: ${session.proposals.length}\nVotes: ${session.votes.length}`,
        inline: true
      }
    )
    .setTimestamp();

  return embed;
}

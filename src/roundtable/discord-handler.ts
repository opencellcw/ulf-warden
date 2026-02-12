import { Message } from 'discord.js';
import { getRoundTableOrchestrator } from './core';
import { DEFAULT_PERSONAS, FULL_PERSONAS, COMPACT_PERSONAS, suggestTeam } from './personas';
import { VotingRule } from './types';
import { buildRoundTableEmbed, buildActionButtons, buildCompactSummary, buildDiscussionEmbed, buildProposalsEmbed, buildStatsEmbed } from './discord-formatter';
import { getRouter } from '../llm';
import { log } from '../logger';

/**
 * Handle RoundTable commands in Discord
 */

/**
 * Check if message is a RoundTable command
 */
export function isRoundTableCommand(message: string): boolean {
  const patterns = [
    /!roundtable\b/i,
    /modo.*conselho/i,
    /mesa.*redonda/i,
    /reunião.*especialistas/i
  ];

  return patterns.some(pattern => pattern.test(message));
}

/**
 * Handle RoundTable command
 */
export async function handleRoundTableCommand(message: Message): Promise<void> {
  try {
    const userId = `discord_${message.author.id}`;
    const content = message.content;

    // Parse command
    const config = parseRoundTableCommand(content);

    if (!config.topic) {
      await message.reply(`❌ Please specify a topic for discussion.

**Usage**: \`!roundtable [topic]\`

**Examples**:
- \`!roundtable Should we use MongoDB or PostgreSQL?\`
- \`!roundtable How to scale our API to handle 1M requests/day?\`
- \`!roundtable What's the best deployment strategy for our app?\`

**Options**:
- \`--rounds [1-5]\` - Number of discussion rounds (default: 3)
- \`--voting [majority|rated|ranked|unanimity]\` - Voting rule (default: majority)
- \`--team [default|full|compact]\` - Team size (default: default - 5 agents)
`);
      return;
    }

    // Send initial message
    const statusMessage = await message.reply(`🎯 **Starting RoundTable Discussion**

**Topic**: ${config.topic}

**Participants**: ${config.agents.map(a => `${a.emoji} ${a.name}`).join(', ')}

**Rounds**: ${config.maxRounds}
**Voting Rule**: ${config.votingRule}

⏳ The agents are deliberating... This may take 1-2 minutes.`);

    // Get orchestrator and run session
    const router = getRouter();
    const orchestrator = getRoundTableOrchestrator(router.getActivePrimaryProvider());

    log.info('[RoundTable] Starting session', {
      userId,
      topic: config.topic,
      agentCount: config.agents.length,
      votingRule: config.votingRule
    });

    const result = await orchestrator.run({
      ...config,
      userId,
      autoStop: true // Enable early stopping if consensus reached
    });

    log.info('[RoundTable] Session complete', {
      userId,
      sessionId: result.session.id,
      winner: result.winner.title,
      consensusScore: result.consensusScore
    });

    // Update message with results
    await statusMessage.edit({
      content: null,
      embeds: [buildRoundTableEmbed(result)],
      components: [buildActionButtons(result.session.id)]
    });

    // Send compact summary in thread
    const thread = await message.startThread({
      name: `RoundTable: ${config.topic.substring(0, 50)}`,
      autoArchiveDuration: 60
    });

    await thread.send(`**Full Discussion Details**\n\n${buildCompactSummary(result)}`);

  } catch (error: any) {
    log.error('[RoundTable] Command failed', {
      error: error.message
    });

    await message.reply(`❌ RoundTable session failed: ${error.message}

Please try again or simplify your topic.`);
  }
}

/**
 * Handle button interactions
 */
export async function handleRoundTableButton(interaction: any): Promise<void> {
  const [action, type, sessionId] = interaction.customId.split('_');

  if (action !== 'roundtable') return;

  try {
    await interaction.deferReply({ ephemeral: true });

    // TODO: Retrieve session from storage
    // For now, send placeholder
    await interaction.editReply({
      content: `Feature coming soon: View ${type} for session ${sessionId}`,
      ephemeral: true
    });

  } catch (error: any) {
    log.error('[RoundTable] Button interaction failed', {
      error: error.message
    });

    await interaction.editReply({
      content: '❌ Failed to load details. Session may have expired.',
      ephemeral: true
    });
  }
}

/**
 * Parse RoundTable command
 */
function parseRoundTableCommand(content: string): {
  topic: string;
  maxRounds: number;
  votingRule: VotingRule;
  agents: any[];
} {
  // Remove command prefix
  let text = content.replace(/!roundtable\b/i, '').trim();
  text = text.replace(/modo.*conselho\b/i, '').trim();
  text = text.replace(/mesa.*redonda\b/i, '').trim();

  // Extract options
  const roundsMatch = text.match(/--rounds?\s+(\d+)/i);
  const maxRounds = roundsMatch ? Math.min(parseInt(roundsMatch[1]), 5) : 3;

  const votingMatch = text.match(/--voting\s+(majority|rated|ranked|unanimity)/i);
  const votingRule: VotingRule = votingMatch ? votingMatch[1].toLowerCase() as VotingRule : 'majority';

  const teamMatch = text.match(/--team\s+(default|full|compact)/i);
  const team = teamMatch ? teamMatch[1].toLowerCase() : 'default';

  // Remove options from topic
  text = text.replace(/--rounds?\s+\d+/gi, '');
  text = text.replace(/--voting\s+\w+/gi, '');
  text = text.replace(/--team\s+\w+/gi, '');
  text = text.trim();

  // Determine agents based on team
  let agents;
  if (team === 'full') {
    agents = FULL_PERSONAS;
  } else if (team === 'compact') {
    agents = COMPACT_PERSONAS;
  } else {
    // Use suggestTeam for intelligent selection
    agents = text.length > 0 ? suggestTeam(text) : DEFAULT_PERSONAS;
  }

  return {
    topic: text,
    maxRounds,
    votingRule,
    agents
  };
}

/**
 * Check if message should trigger automatic RoundTable
 * (for complex topics without explicit command)
 */
export function shouldAutoTriggerRoundTable(message: string): boolean {
  // Don't auto-trigger if explicit command present
  if (isRoundTableCommand(message)) {
    return false;
  }

  // Trigger keywords
  const triggerKeywords = [
    'opiniões diversas',
    'múltiplas perspectivas',
    'dilema',
    'trade.*off',
    'decisão difícil',
    'prós e contras',
    'debate',
    'conselho',
    'what.*should.*we',
    'how.*should.*we',
    'opinião.*especialistas'
  ];

  const lowerMessage = message.toLowerCase();
  const hasTrigger = triggerKeywords.some(keyword => 
    new RegExp(keyword, 'i').test(lowerMessage)
  );

  // Also check complexity (questions, length, multiple options)
  const hasQuestion = message.includes('?');
  const isLong = message.length > 150;
  const hasOptions = /\bor\b|\bvs\b|versus/i.test(message);

  const complexityScore = (hasTrigger ? 0.4 : 0) +
                          (hasQuestion ? 0.2 : 0) +
                          (isLong ? 0.2 : 0) +
                          (hasOptions ? 0.2 : 0);

  return complexityScore >= 0.6; // Threshold for auto-trigger
}

/**
 * Suggest RoundTable for complex query
 */
export async function suggestRoundTable(message: Message, reason: string): Promise<void> {
  await message.reply(`💡 **RoundTable Suggestion**

This looks like a complex topic that could benefit from multiple perspectives!

${reason}

Would you like to start a RoundTable discussion? React with 🎯 or type:
\`!roundtable ${message.content.substring(0, 100)}\``);
}

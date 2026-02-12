/**
 * Decision Intelligence Discord Handler
 * 
 * Comandos Discord para análise de decisões
 */

import { Message, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getDecisionAnalyzer } from './analyzer';
import { DecisionRequest, DecisionAnalysis, DecisionCategory } from './types';
import { log } from '../logger';

/**
 * Verifica se é comando de decisão
 */
export function isDecisionCommand(content: string): boolean {
  return content.startsWith('!decide') || content.startsWith('!decision');
}

/**
 * Verifica se é comando de histórico
 */
export function isDecisionHistoryCommand(content: string): boolean {
  return content.startsWith('!decisions');
}

/**
 * Handler para comandos de histórico (!decisions history, !decisions stats, etc.)
 */
export async function handleDecisionHistoryCommand(message: Message): Promise<void> {
  const content = message.content.toLowerCase();
  
  // !decisions history
  if (content.includes('history')) {
    await sendUserHistory(message);
    return;
  }
  
  // !decisions stats
  if (content.includes('stats')) {
    await sendUserStats(message);
    return;
  }
  
  // !decisions recent
  if (content.includes('recent')) {
    await sendRecentDecisions(message);
    return;
  }
  
  // !decisions help
  await sendDecisionsHelp(message);
}

/**
 * Handler principal do comando !decide
 */
export async function handleDecisionCommand(message: Message): Promise<void> {
  const content = message.content;
  
  // Extrair pergunta
  const question = content
    .replace(/^!(decide|decision)\s*/i, '')
    .trim();
  
  if (!question) {
    await sendUsageHelp(message);
    return;
  }
  
  // Enviar mensagem de "processando"
  const processingMsg = await message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🧠 Analyzing Decision...')
        .setDescription(
          `Consulting 5 AI perspectives:\n` +
          `📊 Strategic Analyst\n` +
          `💡 Creative Strategist\n` +
          `⚠️ Critical Skeptic\n` +
          `🔨 Pragmatic Executor\n` +
          `🎯 Ethical Advisor\n\n` +
          `This may take 30-60 seconds...`
        )
        .setTimestamp()
    ]
  });
  
  try {
    // Parsear alternativas (se houver)
    const alternatives = parseAlternatives(question);
    const cleanQuestion = cleanQuestionText(question, alternatives);
    
    // Criar request
    const request: DecisionRequest = {
      question: cleanQuestion,
      alternatives: alternatives.length > 0 ? alternatives : undefined,
      userId: message.author.id,
      channelId: message.channelId,
      platform: 'discord',
      category: inferCategory(cleanQuestion),
    };
    
    // Analisar
    const analyzer = getDecisionAnalyzer();
    const analysis = await analyzer.analyze(request);
    
    // Enviar resultado
    await processingMsg.edit({
      embeds: buildAnalysisEmbeds(analysis),
      components: buildActionButtons(analysis),
    });
    
    log.info('[DecisionHandler] Analysis delivered', {
      userId: message.author.id,
      question: cleanQuestion,
      timeMs: analysis.analysisTimeMs,
    });
    
  } catch (error) {
    log.error('[DecisionHandler] Failed to analyze', { error });
    await processingMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('❌ Analysis Failed')
          .setDescription(
            `Sorry, I couldn't complete the analysis.\n\n` +
            `Error: ${error}\n\n` +
            `Please try again or contact support.`
          )
      ]
    });
  }
}

/**
 * Parsear alternativas do formato: "A ou B?" ou "opção X vs opção Y"
 */
function parseAlternatives(question: string): string[] {
  const alternatives: string[] = [];
  
  // Padrão: "X ou Y"
  const orPattern = /(.+?)\s+(ou|or|vs|versus)\s+(.+?)(\?|$)/i;
  const orMatch = question.match(orPattern);
  
  if (orMatch) {
    alternatives.push(orMatch[1].trim());
    alternatives.push(orMatch[3].trim().replace(/\?$/, ''));
    return alternatives;
  }
  
  // Padrão: "opção A: ... opção B: ..."
  const optionPattern = /(?:opção|option|alternative)\s*([A-Za-z0-9]+):\s*([^,;]+)/gi;
  let match;
  while ((match = optionPattern.exec(question)) !== null) {
    alternatives.push(match[2].trim());
  }
  
  return alternatives;
}

/**
 * Limpar texto da pergunta removendo alternativas já parseadas
 */
function cleanQuestionText(question: string, alternatives: string[]): string {
  let clean = question;
  
  // Remover padrão "ou/vs"
  clean = clean.replace(/(.+?)\s+(ou|or|vs|versus)\s+(.+?)(\?|$)/i, (match, a, connector, b) => {
    if (alternatives.includes(a.trim()) && alternatives.includes(b.trim().replace(/\?$/, ''))) {
      return `${a.trim()} ${connector} ${b.trim()}`;
    }
    return match;
  });
  
  return clean.trim();
}

/**
 * Inferir categoria da decisão
 */
function inferCategory(question: string): DecisionCategory {
  const lower = question.toLowerCase();
  
  const patterns = {
    [DecisionCategory.TECHNICAL]: ['arquitetura', 'tecnologia', 'framework', 'database', 'api', 'código'],
    [DecisionCategory.BUSINESS]: ['estratégia', 'mercado', 'produto', 'cliente', 'revenue', 'growth'],
    [DecisionCategory.FINANCIAL]: ['investir', 'custo', 'preço', 'orçamento', 'budget', 'roi'],
    [DecisionCategory.HIRING]: ['contratar', 'hire', 'equipe', 'team', 'candidato', 'talento'],
    [DecisionCategory.STRATEGIC]: ['direção', 'visão', 'longo prazo', 'futuro', 'pivô', 'expansão'],
  };
  
  for (const [category, keywords] of Object.entries(patterns)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category as DecisionCategory;
    }
  }
  
  return DecisionCategory.OTHER;
}

/**
 * Construir embeds com a análise
 */
function buildAnalysisEmbeds(analysis: DecisionAnalysis): EmbedBuilder[] {
  const embeds: EmbedBuilder[] = [];
  
  // Embed 1: Summary & Consensus
  const consensusEmbed = new EmbedBuilder()
    .setColor(analysis.consensus.unanimity ? 0x00FF00 : (analysis.consensus.splitVote ? 0xFF9900 : 0x0099FF))
    .setTitle('🧠 Decision Analysis Complete')
    .setDescription(
      `**Question:** ${analysis.question}\n\n` +
      (analysis.alternatives.length > 0 
        ? `**Alternatives:**\n${analysis.alternatives.map((a, i) => `${String.fromCharCode(65 + i)}. ${a}`).join('\n')}\n\n`
        : '') +
      `**Analysis Time:** ${(analysis.analysisTimeMs / 1000).toFixed(1)}s`
    )
    .addFields(
      {
        name: '📊 Consensus Recommendation',
        value: analysis.consensus.recommendation,
        inline: false,
      },
      {
        name: '💯 Confidence Score',
        value: `${analysis.consensus.confidenceScore}/100`,
        inline: true,
      },
      {
        name: '🤝 Agreement Level',
        value: `${analysis.consensus.agreementLevel}%`,
        inline: true,
      },
      {
        name: '🗳️ Majority Vote',
        value: analysis.consensus.majorityVote,
        inline: true,
      }
    );
  
  if (analysis.consensus.dissent.length > 0) {
    consensusEmbed.addFields({
      name: '⚠️ Dissenting Opinions',
      value: analysis.consensus.dissent.join(', '),
      inline: false,
    });
  }
  
  if (analysis.consensus.alternativeSuggestions.length > 0) {
    consensusEmbed.addFields({
      name: '💡 Alternative Suggestions',
      value: analysis.consensus.alternativeSuggestions.slice(0, 3).join('\n'),
      inline: false,
    });
  }
  
  embeds.push(consensusEmbed);
  
  // Embed 2: Aggregated Insights
  const insightsEmbed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('📝 Key Insights')
    .addFields(
      {
        name: '✅ Top Advantages',
        value: analysis.consensus.topPros.slice(0, 3).map(p => `• ${p}`).join('\n') || 'None identified',
        inline: false,
      },
      {
        name: '❌ Top Concerns',
        value: analysis.consensus.topCons.slice(0, 3).map(c => `• ${c}`).join('\n') || 'None identified',
        inline: false,
      },
      {
        name: '⚠️ Top Risks',
        value: analysis.consensus.topRisks.slice(0, 3).map(r => `• ${r}`).join('\n') || 'None identified',
        inline: false,
      },
      {
        name: '❓ Critical Questions',
        value: analysis.consensus.criticalQuestions.slice(0, 3).map(q => `• ${q}`).join('\n') || 'None identified',
        inline: false,
      }
    );
  
  embeds.push(insightsEmbed);
  
  // Embed 3: Individual Perspectives (resumido)
  const perspectivesEmbed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('👥 Individual Perspectives');
  
  for (const p of analysis.perspectives) {
    const emoji = p.agentName.split(' ')[0]; // Pega emoji do nome
    perspectivesEmbed.addFields({
      name: `${emoji} ${p.agentName} (${p.confidence}/100)`,
      value: 
        `**Recommends:** ${p.recommendation}\n` +
        `**Key Point:** ${p.reasoning.substring(0, 150)}${p.reasoning.length > 150 ? '...' : ''}`,
      inline: false,
    });
  }
  
  embeds.push(perspectivesEmbed);
  
  return embeds;
}

/**
 * Construir botões de ação
 */
function buildActionButtons(analysis: DecisionAnalysis): ActionRowBuilder<ButtonBuilder>[] {
  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`decision_details_${analysis.requestId}`)
        .setLabel('View Full Analysis')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📄'),
      new ButtonBuilder()
        .setCustomId(`decision_save_${analysis.requestId}`)
        .setLabel('Save Decision')
        .setStyle(ButtonStyle.Success)
        .setEmoji('💾'),
      new ButtonBuilder()
        .setCustomId(`decision_share_${analysis.requestId}`)
        .setLabel('Share')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔗')
    );
  
  return [row];
}

/**
 * Enviar histórico do usuário
 */
async function sendUserHistory(message: Message): Promise<void> {
  const { DecisionStorage } = await import('./storage');
  const storage = new DecisionStorage();
  
  const history = storage.getByUser(message.author.id, 10);
  
  if (history.length === 0) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('📋 Your Decision History')
          .setDescription('You haven\'t made any decisions yet!\n\nTry: `!decide Should I...?`')
      ]
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('📋 Your Recent Decisions')
    .setDescription(`Showing last ${history.length} decisions:`);
  
  for (const decision of history) {
    const date = new Date(decision.timestamp).toLocaleDateString();
    const implementedIcon = decision.implemented ? '✅' : '⏳';
    const outcomeText = decision.outcome ? ` (${decision.outcome})` : '';
    
    embed.addFields({
      name: `${implementedIcon} ${date}`,
      value: 
        `**Q:** ${decision.question.substring(0, 100)}${decision.question.length > 100 ? '...' : ''}\n` +
        `**R:** ${decision.recommendation.substring(0, 150)}${decision.recommendation.length > 150 ? '...' : ''}` +
        outcomeText +
        `\n*Confidence: ${decision.confidence}/100 • Agreement: ${decision.agreement}%*`,
      inline: false,
    });
  }
  
  embed.setFooter({ text: `Use !decisions stats to see your statistics` });
  
  await message.reply({ embeds: [embed] });
}

/**
 * Enviar estatísticas do usuário
 */
async function sendUserStats(message: Message): Promise<void> {
  const { DecisionStorage } = await import('./storage');
  const storage = new DecisionStorage();
  
  const stats = storage.getUserStats(message.author.id);
  
  if (stats.totalDecisions === 0) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('📊 Your Decision Stats')
          .setDescription('No decisions yet! Try: `!decide Should I...?`')
      ]
    });
    return;
  }
  
  const totalImplemented = stats.byOutcome.success + stats.byOutcome.failure + stats.byOutcome.mixed;
  
  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('📊 Your Decision Intelligence Stats')
    .addFields(
      {
        name: '📝 Total Decisions',
        value: stats.totalDecisions.toString(),
        inline: true,
      },
      {
        name: '✅ Decided & Acted',
        value: `${totalImplemented} (${((totalImplemented / stats.totalDecisions) * 100).toFixed(0)}%)`,
        inline: true,
      },
      {
        name: '💯 Avg Confidence',
        value: `${stats.averageConfidence.toFixed(0)}/100`,
        inline: true,
      },
      {
        name: '🤝 Avg Agreement',
        value: `${stats.averageAgreement.toFixed(0)}%`,
        inline: true,
      },
      {
        name: '🎯 Most Common Category',
        value: stats.mostCommonCategory || 'N/A',
        inline: true,
      },
      {
        name: '📈 Outcomes',
        value: 
          `✅ Success: ${stats.byOutcome.success}\n` +
          `❌ Failure: ${stats.byOutcome.failure}\n` +
          `⚖️ Mixed: ${stats.byOutcome.mixed}\n` +
          `⏳ Pending: ${stats.byOutcome.pending}`,
        inline: true,
      }
    );
  
  await message.reply({ embeds: [embed] });
}

/**
 * Enviar decisões recentes (todas, não só do usuário)
 */
async function sendRecentDecisions(message: Message): Promise<void> {
  const { DecisionStorage } = await import('./storage');
  const storage = new DecisionStorage();
  
  const recent = storage.getRecent(5);
  
  if (recent.length === 0) {
    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🌐 Recent Decisions (All Users)')
          .setDescription('No decisions yet in this server!')
      ]
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('🌐 Recent Decisions (All Users)')
    .setDescription(`Last ${recent.length} decisions:`);
  
  for (const decision of recent) {
    const date = new Date(decision.timestamp).toLocaleDateString();
    const implementedIcon = decision.implemented ? '✅' : '⏳';
    
    embed.addFields({
      name: `${implementedIcon} ${date}`,
      value: 
        `**Q:** ${decision.question.substring(0, 100)}${decision.question.length > 100 ? '...' : ''}\n` +
        `**R:** ${decision.recommendation.substring(0, 150)}${decision.recommendation.length > 150 ? '...' : ''}` +
        `\n*Confidence: ${decision.confidence}/100 • Agreement: ${decision.agreement}%*`,
      inline: false,
    });
  }
  
  await message.reply({ embeds: [embed] });
}

/**
 * Enviar ajuda para comandos !decisions
 */
async function sendDecisionsHelp(message: Message): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('📚 Decision Commands Help')
    .setDescription('Available commands:')
    .addFields(
      {
        name: '!decisions history',
        value: 'Show your decision history (last 10)',
        inline: false,
      },
      {
        name: '!decisions stats',
        value: 'Show your decision statistics',
        inline: false,
      },
      {
        name: '!decisions recent',
        value: 'Show recent decisions from all users',
        inline: false,
      },
      {
        name: '!decide [question]',
        value: 'Analyze a new decision',
        inline: false,
      }
    )
    .setFooter({ text: 'Use !decide help for more details on decision analysis' });
  
  await message.reply({ embeds: [embed] });
}

/**
 * Enviar mensagem de ajuda
 */
async function sendUsageHelp(message: Message): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('🧠 Decision Intelligence System')
    .setDescription(
      'Get multi-perspective AI analysis for any important decision!'
    )
    .addFields(
      {
        name: '📋 Usage',
        value: 
          '`!decide [your question]`\n' +
          '`!decision [your question]`',
        inline: false,
      },
      {
        name: '💡 Examples',
        value:
          '• `!decide Should I migrate to microservices or keep monolith?`\n' +
          '• `!decision Hire senior dev now or wait for perfect candidate?`\n' +
          '• `!decide Invest in SEO or paid ads for growth?`\n' +
          '• `!decision React ou Vue for new project?`',
        inline: false,
      },
      {
        name: '🎯 What You Get',
        value:
          '✅ Analysis from 5 different AI perspectives\n' +
          '✅ Consensus recommendation with confidence score\n' +
          '✅ Key pros, cons, and risks\n' +
          '✅ Critical questions to consider\n' +
          '✅ Alternative suggestions',
        inline: false,
      },
      {
        name: '⚡ Response Time',
        value: '30-60 seconds for complete analysis',
        inline: false,
      }
    )
    .setFooter({ text: 'Powered by GPT-4, Claude & Gemini' });
  
  await message.reply({ embeds: [embed] });
}

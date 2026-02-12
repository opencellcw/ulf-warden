import { BotConfig, BotType, BotTool } from './types';

/**
 * Persona Badge Configuration
 * Visual identity for each bot type and specialty
 */

interface PersonaBadge {
  emoji: string;
  color: string; // Hex color for Discord embeds
  label: string;
  tagline?: string;
}

/**
 * Get badge based on bot type
 */
export function getTypeBadge(type: BotType): PersonaBadge {
  switch (type) {
    case 'conversational':
      return {
        emoji: '💬',
        color: '#5865F2', // Discord Blue
        label: 'Conversational Bot',
        tagline: 'Chat Assistant'
      };
    case 'agent':
      return {
        emoji: '🤖',
        color: '#57F287', // Discord Green
        label: 'Agent Bot',
        tagline: 'Coding Agent with Tools'
      };
  }
}

/**
 * Get specialty badge based on personality/name
 */
export function getSpecialtyBadge(name: string, personality: string): PersonaBadge {
  const lowerName = name.toLowerCase();
  const lowerPersonality = personality.toLowerCase();

  // DevOps / Infrastructure
  if (lowerName.includes('devops') || lowerName.includes('ops') ||
      lowerPersonality.includes('kubernetes') || lowerPersonality.includes('deployment')) {
    return {
      emoji: '⚙️',
      color: '#3498db',
      label: 'DevOps Specialist'
    };
  }

  // Security
  if (lowerName.includes('guard') || lowerName.includes('security') || lowerName.includes('scanner') ||
      lowerPersonality.includes('security') || lowerPersonality.includes('vulnerability')) {
    return {
      emoji: '🛡️',
      color: '#e74c3c',
      label: 'Security Specialist'
    };
  }

  // Data / Analytics
  if (lowerName.includes('oracle') || lowerName.includes('data') || lowerName.includes('analyst') ||
      lowerPersonality.includes('data') || lowerPersonality.includes('analytics')) {
    return {
      emoji: '📊',
      color: '#9b59b6',
      label: 'Data Analyst'
    };
  }

  // Support / Help
  if (lowerName.includes('support') || lowerName.includes('help') ||
      lowerPersonality.includes('support') || lowerPersonality.includes('customer')) {
    return {
      emoji: '💁',
      color: '#f39c12',
      label: 'Support Agent'
    };
  }

  // Code Review
  if (lowerName.includes('review') || lowerName.includes('code') ||
      lowerPersonality.includes('review') || lowerPersonality.includes('code quality')) {
    return {
      emoji: '👨‍💻',
      color: '#1abc9c',
      label: 'Code Reviewer'
    };
  }

  // Documentation
  if (lowerName.includes('docs') || lowerName.includes('documentation') ||
      lowerPersonality.includes('documentation') || lowerPersonality.includes('technical writer')) {
    return {
      emoji: '📚',
      color: '#34495e',
      label: 'Documentation Specialist'
    };
  }

  // Monitoring
  if (lowerName.includes('monitor') || lowerName.includes('watch') ||
      lowerPersonality.includes('monitor') || lowerPersonality.includes('observability')) {
    return {
      emoji: '👁️',
      color: '#16a085',
      label: 'System Monitor'
    };
  }

  // Incident Response
  if (lowerName.includes('incident') || lowerName.includes('emergency') ||
      lowerPersonality.includes('incident') || lowerPersonality.includes('emergency')) {
    return {
      emoji: '🚨',
      color: '#c0392b',
      label: 'Incident Response'
    };
  }

  // Performance
  if (lowerName.includes('perf') || lowerName.includes('performance') ||
      lowerPersonality.includes('performance') || lowerPersonality.includes('optimization')) {
    return {
      emoji: '⚡',
      color: '#f1c40f',
      label: 'Performance Expert'
    };
  }

  // Default - Generic Assistant
  return {
    emoji: '🤝',
    color: '#95a5a6',
    label: 'Assistant'
  };
}

/**
 * Get tool badges for agent bots
 */
export function getToolBadges(tools: BotTool[]): string {
  const toolEmojis: Record<BotTool, string> = {
    bash: '💻',
    read: '📖',
    write: '✍️',
    edit: '✏️',
    kubectl: '☸️',
    gcloud: '☁️',
    git: '🔀'
  };

  if (!tools || tools.length === 0) return '';

  return tools.map(tool => `${toolEmojis[tool]} ${tool}`).join(' • ');
}

/**
 * Format response with persona badge header
 */
export function formatPersonaResponse(
  botName: string,
  config: BotConfig,
  response: string,
  useEmbed: boolean = false
): string {
  const typeBadge = getTypeBadge(config.type);
  const specialtyBadge = getSpecialtyBadge(botName, config.personality);
  
  // Plain text format (for simple replies)
  if (!useEmbed) {
    const toolsInfo = config.type === 'agent' && config.allowedTools && config.allowedTools.length > 0
      ? `\n🔧 ${getToolBadges(config.allowedTools)}`
      : '';

    return `${specialtyBadge.emoji} **${botName}** • ${specialtyBadge.label}${toolsInfo}\n━━━━━━━━━━━━━━━━━━━━━━\n${response}`;
  }

  // If using Discord embeds, return formatted object (caller must handle embed creation)
  return response;
}

/**
 * Generate Discord embed data for rich persona display
 */
export function generatePersonaEmbed(
  botName: string,
  config: BotConfig,
  response: string
) {
  const typeBadge = getTypeBadge(config.type);
  const specialtyBadge = getSpecialtyBadge(botName, config.personality);

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  // Add type field
  fields.push({
    name: '🤖 Type',
    value: typeBadge.label,
    inline: true
  });

  // Add specialty field
  if (specialtyBadge.label !== 'Assistant') {
    fields.push({
      name: '⭐ Role',
      value: specialtyBadge.label,
      inline: true
    });
  }

  // Add model field
  fields.push({
    name: '🧠 Model',
    value: config.model,
    inline: true
  });

  // Add tools field for agent bots
  if (config.type === 'agent' && config.allowedTools && config.allowedTools.length > 0) {
    fields.push({
      name: '🔧 Tools',
      value: getToolBadges(config.allowedTools),
      inline: false
    });
  }

  return {
    color: parseInt(specialtyBadge.color.replace('#', ''), 16),
    author: {
      name: `${specialtyBadge.emoji} ${botName}`,
      iconURL: undefined // Optional: could add bot avatar
    },
    description: response,
    fields,
    footer: {
      text: `${typeBadge.tagline || typeBadge.label}`,
      iconURL: undefined
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Format persona header for simple display
 */
export function getPersonaHeader(botName: string, config: BotConfig): string {
  const specialtyBadge = getSpecialtyBadge(botName, config.personality);
  const typeBadge = getTypeBadge(config.type);
  
  const toolsInfo = config.type === 'agent' && config.allowedTools && config.allowedTools.length > 0
    ? ` | 🔧 ${config.allowedTools.join(', ')}`
    : '';

  return `${specialtyBadge.emoji} **${botName}** • ${specialtyBadge.label} • ${typeBadge.emoji} ${typeBadge.label}${toolsInfo}`;
}

/**
 * Get short persona tag (for prefixing responses)
 */
export function getPersonaTag(botName: string, config: BotConfig): string {
  const specialtyBadge = getSpecialtyBadge(botName, config.personality);
  return `${specialtyBadge.emoji} ${botName}`;
}

/**
 * Format system notification about bot persona
 */
export function formatPersonaIntro(botName: string, config: BotConfig): string {
  const specialtyBadge = getSpecialtyBadge(botName, config.personality);
  const typeBadge = getTypeBadge(config.type);
  
  let intro = `${specialtyBadge.emoji} Hi! I'm **${botName}**, your ${specialtyBadge.label}.\n\n`;
  
  if (config.type === 'agent' && config.allowedTools && config.allowedTools.length > 0) {
    intro += `🤖 I'm an **Agent Bot** with access to these tools:\n`;
    intro += getToolBadges(config.allowedTools) + '\n\n';
  } else {
    intro += `💬 I'm a **Conversational Bot** focused on helping through conversation.\n\n`;
  }
  
  intro += `Ask me anything related to my role!`;
  
  return intro;
}

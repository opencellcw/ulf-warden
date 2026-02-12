import * as fs from 'fs';
import * as path from 'path';
import { log } from '../logger';

/**
 * Pi Skills Loader
 * Loads official Pi skills and makes them available to bots
 */

export interface PiSkill {
  name: string;
  description: string;
  triggers: string[];
  content: string;
  path: string;
  category: 'anthropic' | 'pi-custom' | 'bot-custom';
  safetyLevel: 'safe' | 'caution' | 'restricted';
}

/**
 * Skill Categories and Safety Levels
 */
const SKILL_METADATA: Record<string, { 
  triggers: string[];
  safetyLevel: 'safe' | 'caution' | 'restricted';
}> = {
  // Anthropic Skills (official, safe)
  'brave-search': {
    triggers: ['search', 'find', 'lookup', 'query', 'google'],
    safetyLevel: 'safe'
  },
  'browser-tools': {
    triggers: ['browser', 'screenshot', 'webpage', 'scrape', 'navigate'],
    safetyLevel: 'caution'
  },
  'transcribe': {
    triggers: ['transcribe', 'speech-to-text', 'audio', 'voice'],
    safetyLevel: 'safe'
  },
  'youtube-transcript': {
    triggers: ['youtube', 'video transcript', 'yt'],
    safetyLevel: 'safe'
  },
  'gccli': {
    triggers: ['calendar', 'schedule', 'meeting', 'event'],
    safetyLevel: 'caution'
  },
  'gdcli': {
    triggers: ['drive', 'google drive', 'files', 'upload', 'download'],
    safetyLevel: 'caution'
  },
  'gmcli': {
    triggers: ['email', 'gmail', 'send email', 'inbox'],
    safetyLevel: 'restricted'
  },
  'vscode': {
    triggers: ['diff', 'compare', 'changes', 'vscode'],
    safetyLevel: 'safe'
  },
  'pdf': {
    triggers: ['pdf', 'document', 'extract text'],
    safetyLevel: 'safe'
  },
  'docx': {
    triggers: ['word', 'docx', 'document'],
    safetyLevel: 'safe'
  },
  'xlsx': {
    triggers: ['excel', 'spreadsheet', 'csv', 'xlsx'],
    safetyLevel: 'safe'
  },
  'pptx': {
    triggers: ['powerpoint', 'slides', 'presentation', 'pptx'],
    safetyLevel: 'safe'
  },
  'frontend-design': {
    triggers: ['ui', 'frontend', 'react', 'component', 'design'],
    safetyLevel: 'safe'
  },
  'webapp-testing': {
    triggers: ['test', 'playwright', 'automation', 'e2e'],
    safetyLevel: 'caution'
  },
  'mcp-builder': {
    triggers: ['mcp', 'model context protocol', 'server'],
    safetyLevel: 'safe'
  },
  'doc-coauthoring': {
    triggers: ['documentation', 'docs', 'write doc'],
    safetyLevel: 'safe'
  }
};

/**
 * Load all available Pi skills
 */
export class PiSkillsLoader {
  private skillsCache: Map<string, PiSkill> = new Map();
  private anthropicSkillsPath: string;
  private piSkillsPath: string;

  constructor() {
    // Default Pi skills paths
    this.anthropicSkillsPath = path.join(
      process.env.HOME || '/root',
      '.pi/agent/skills/anthropic-skills/skills'
    );
    this.piSkillsPath = path.join(
      process.env.HOME || '/root',
      '.pi/agent/skills/pi-skills'
    );
  }

  /**
   * Load all skills
   */
  async loadAllSkills(): Promise<PiSkill[]> {
    const skills: PiSkill[] = [];

    // Load Anthropic official skills
    try {
      const anthropicSkills = await this.loadSkillsFromDir(
        this.anthropicSkillsPath,
        'anthropic'
      );
      skills.push(...anthropicSkills);
      log.info('[Pi Skills] Loaded Anthropic skills', {
        count: anthropicSkills.length
      });
    } catch (error: any) {
      log.warn('[Pi Skills] Failed to load Anthropic skills', {
        error: error.message
      });
    }

    // Load Pi custom skills
    try {
      const piSkills = await this.loadSkillsFromDir(
        this.piSkillsPath,
        'pi-custom'
      );
      skills.push(...piSkills);
      log.info('[Pi Skills] Loaded Pi custom skills', {
        count: piSkills.length
      });
    } catch (error: any) {
      log.warn('[Pi Skills] Failed to load Pi custom skills', {
        error: error.message
      });
    }

    // Cache skills
    skills.forEach(skill => {
      this.skillsCache.set(skill.name, skill);
    });

    log.info('[Pi Skills] Total skills loaded', {
      total: skills.length,
      anthropic: skills.filter(s => s.category === 'anthropic').length,
      piCustom: skills.filter(s => s.category === 'pi-custom').length
    });

    return skills;
  }

  /**
   * Load skills from directory
   */
  private async loadSkillsFromDir(
    dir: string,
    category: 'anthropic' | 'pi-custom'
  ): Promise<PiSkill[]> {
    const skills: PiSkill[] = [];

    if (!fs.existsSync(dir)) {
      log.warn('[Pi Skills] Directory not found', { dir });
      return skills;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillDir = path.join(dir, entry.name);
      const skillFile = path.join(skillDir, 'SKILL.md');

      if (!fs.existsSync(skillFile)) {
        log.debug('[Pi Skills] No SKILL.md found', { skillDir });
        continue;
      }

      try {
        const content = fs.readFileSync(skillFile, 'utf-8');
        const metadata = SKILL_METADATA[entry.name] || {
          triggers: [entry.name],
          safetyLevel: 'caution' as const
        };

        // Extract description from SKILL.md
        const descMatch = content.match(/description:\s*(.+)/i);
        const description = descMatch 
          ? descMatch[1].trim()
          : `Skill: ${entry.name}`;

        const skill: PiSkill = {
          name: entry.name,
          description,
          triggers: metadata.triggers,
          content,
          path: skillFile,
          category,
          safetyLevel: metadata.safetyLevel
        };

        skills.push(skill);
      } catch (error: any) {
        log.error('[Pi Skills] Failed to load skill', {
          name: entry.name,
          error: error.message
        });
      }
    }

    return skills;
  }

  /**
   * Get skill by name
   */
  getSkill(name: string): PiSkill | undefined {
    return this.skillsCache.get(name);
  }

  /**
   * Find skills by trigger keyword
   */
  findSkillsByTrigger(text: string): PiSkill[] {
    const lowerText = text.toLowerCase();
    const matches: PiSkill[] = [];

    for (const skill of this.skillsCache.values()) {
      for (const trigger of skill.triggers) {
        if (lowerText.includes(trigger.toLowerCase())) {
          matches.push(skill);
          break;
        }
      }
    }

    return matches;
  }

  /**
   * Get skills by safety level
   */
  getSkillsBySafety(level: 'safe' | 'caution' | 'restricted'): PiSkill[] {
    return Array.from(this.skillsCache.values())
      .filter(skill => skill.safetyLevel === level);
  }

  /**
   * Get safe skills only (for default bots)
   */
  getSafeSkills(): PiSkill[] {
    return this.getSkillsBySafety('safe');
  }

  /**
   * Generate skills catalog for bot prompt
   */
  generateSkillsCatalog(
    allowedSafetyLevels: ('safe' | 'caution' | 'restricted')[] = ['safe', 'caution']
  ): string {
    const skills = Array.from(this.skillsCache.values())
      .filter(skill => allowedSafetyLevels.includes(skill.safetyLevel));

    const catalog = [
      '# 📚 AVAILABLE Pi SKILLS',
      '',
      'You have access to these official Pi skills. Use them when appropriate!',
      ''
    ];

    // Group by category
    const byCategory = {
      safe: skills.filter(s => s.safetyLevel === 'safe'),
      caution: skills.filter(s => s.safetyLevel === 'caution'),
      restricted: skills.filter(s => s.safetyLevel === 'restricted')
    };

    if (byCategory.safe.length > 0) {
      catalog.push('## ✅ SAFE SKILLS (use freely):');
      catalog.push('');
      byCategory.safe.forEach(skill => {
        catalog.push(`### ${skill.name}`);
        catalog.push(`**Description:** ${skill.description}`);
        catalog.push(`**Triggers:** ${skill.triggers.join(', ')}`);
        catalog.push(`**Usage:** Read skill with \`read: ${skill.path}\``);
        catalog.push('');
      });
    }

    if (byCategory.caution.length > 0) {
      catalog.push('## ⚠️ CAUTION SKILLS (explain before using):');
      catalog.push('');
      byCategory.caution.forEach(skill => {
        catalog.push(`### ${skill.name}`);
        catalog.push(`**Description:** ${skill.description}`);
        catalog.push(`**Triggers:** ${skill.triggers.join(', ')}`);
        catalog.push(`**⚠️ Caution:** Explain what you'll do before using`);
        catalog.push('');
      });
    }

    if (byCategory.restricted.length > 0) {
      catalog.push('## 🔒 RESTRICTED SKILLS (ask permission first):');
      catalog.push('');
      byCategory.restricted.forEach(skill => {
        catalog.push(`### ${skill.name}`);
        catalog.push(`**Description:** ${skill.description}`);
        catalog.push(`**Triggers:** ${skill.triggers.join(', ')}`);
        catalog.push(`**🔒 Restricted:** MUST ask user permission before using`);
        catalog.push('');
      });
    }

    catalog.push('---');
    catalog.push('');
    catalog.push('## 🎯 HOW TO USE SKILLS:');
    catalog.push('');
    catalog.push('1. **Detect trigger keywords** in user message');
    catalog.push('2. **Read the skill** with `read: <skill-path>`');
    catalog.push('3. **Follow skill instructions** precisely');
    catalog.push('4. **Use skill tools/techniques** to solve the task');
    catalog.push('');
    catalog.push('**Example:**');
    catalog.push('```');
    catalog.push('User: "search for kubernetes best practices"');
    catalog.push('');
    catalog.push('You (thinking): Detected "search" trigger → brave-search skill');
    catalog.push('');
    catalog.push('[read: ~/.pi/agent/skills/pi-skills/brave-search/SKILL.md]');
    catalog.push('');
    catalog.push('You (thinking): Skill says use brave_search tool');
    catalog.push('');
    catalog.push('[uses brave_search tool with query]');
    catalog.push('');
    catalog.push('You: "Found 5 resources on K8s best practices..."');
    catalog.push('```');
    catalog.push('');
    catalog.push('**Remember:** Skills enhance your abilities. Use them proactively!');

    return catalog.join('\n');
  }

  /**
   * Get all loaded skills
   */
  getAllSkills(): PiSkill[] {
    return Array.from(this.skillsCache.values());
  }
}

/**
 * Singleton instance
 */
let skillsLoader: PiSkillsLoader | null = null;

export function getPiSkillsLoader(): PiSkillsLoader {
  if (!skillsLoader) {
    skillsLoader = new PiSkillsLoader();
  }
  return skillsLoader;
}

/**
 * Initialize and load skills (call at startup)
 */
export async function initializePiSkills(): Promise<void> {
  const loader = getPiSkillsLoader();
  await loader.loadAllSkills();
  
  log.info('[Pi Skills] Initialization complete', {
    totalSkills: loader.getAllSkills().length,
    safeSkills: loader.getSafeSkills().length
  });
}

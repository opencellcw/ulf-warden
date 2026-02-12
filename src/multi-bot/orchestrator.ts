import { log } from '../logger';
import { memory } from '../memory/vector-memory';
import { supabase } from '../database/supabase';

/**
 * Multi-Bot Orchestrator
 * 
 * Coordinates multiple bots working together on complex tasks.
 * 
 * Features:
 * - Automatic task delegation
 * - Bot-to-bot communication
 * - Context sharing
 * - Parallel execution
 * - Conflict resolution
 * 
 * Example:
 *   User: "Build me a website"
 *   
 *   Orchestrator analyzes and delegates:
 *   ├─> Designer Bot: Creates UI/UX mockups
 *   ├─> Code Bot: Implements frontend
 *   ├─> DevOps Bot: Sets up hosting
 *   └─> Security Bot: Audits everything
 *   
 *   All bots work together automatically!
 */

export interface BotCapability {
  botId: string;
  botName: string;
  skills: string[];
  specialization: string;
  availability: 'available' | 'busy' | 'offline';
  currentLoad: number; // 0-100
}

export interface Task {
  id: string;
  description: string;
  requiredSkills: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[]; // IDs of tasks that must complete first
  assignedBot?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  startTime?: Date;
  endTime?: Date;
}

export interface CollaborationSession {
  id: string;
  userId: string;
  objective: string;
  tasks: Task[];
  participatingBots: string[];
  status: 'planning' | 'executing' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  sharedContext: Map<string, any>;
}

export class MultiBotOrchestrator {
  private sessions: Map<string, CollaborationSession> = new Map();
  private availableBots: Map<string, BotCapability> = new Map();

  constructor() {
    log.info('[Orchestrator] Initialized');
  }

  /**
   * Register a bot's capabilities
   */
  registerBot(capability: BotCapability): void {
    this.availableBots.set(capability.botId, capability);
    log.info('[Orchestrator] Bot registered', {
      botId: capability.botId,
      skills: capability.skills,
    });
  }

  /**
   * Create a new collaboration session
   */
  async createSession(
    userId: string,
    objective: string
  ): Promise<CollaborationSession> {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const session: CollaborationSession = {
      id: sessionId,
      userId,
      objective,
      tasks: [],
      participatingBots: [],
      status: 'planning',
      startTime: new Date(),
      sharedContext: new Map(),
    };

    this.sessions.set(sessionId, session);

    log.info('[Orchestrator] Session created', {
      sessionId,
      userId,
      objective,
    });

    return session;
  }

  /**
   * Analyze objective and break it into tasks
   */
  async planTasks(session: CollaborationSession): Promise<Task[]> {
    log.info('[Orchestrator] Planning tasks', {
      sessionId: session.id,
      objective: session.objective,
    });

    // This is where we'd use LLM to analyze the objective
    // For now, using simple keyword matching
    const tasks: Task[] = [];
    const objective = session.objective.toLowerCase();

    // Design-related
    if (objective.includes('design') || objective.includes('ui') || objective.includes('mockup')) {
      tasks.push({
        id: 'task-design',
        description: 'Create UI/UX design',
        requiredSkills: ['design', 'ui', 'ux'],
        priority: 'high',
        dependencies: [],
        status: 'pending',
      });
    }

    // Code-related
    if (objective.includes('code') || objective.includes('build') || objective.includes('develop')) {
      tasks.push({
        id: 'task-code',
        description: 'Implement code',
        requiredSkills: ['coding', 'development'],
        priority: 'high',
        dependencies: objective.includes('design') ? ['task-design'] : [],
        status: 'pending',
      });
    }

    // DevOps-related
    if (objective.includes('deploy') || objective.includes('host') || objective.includes('server')) {
      tasks.push({
        id: 'task-devops',
        description: 'Setup deployment',
        requiredSkills: ['devops', 'kubernetes', 'docker'],
        priority: 'medium',
        dependencies: ['task-code'],
        status: 'pending',
      });
    }

    // Security-related
    if (objective.includes('secure') || objective.includes('audit') || tasks.length > 0) {
      tasks.push({
        id: 'task-security',
        description: 'Security audit',
        requiredSkills: ['security', 'audit'],
        priority: 'high',
        dependencies: tasks.map(t => t.id),
        status: 'pending',
      });
    }

    session.tasks = tasks;
    log.info('[Orchestrator] Tasks planned', {
      sessionId: session.id,
      taskCount: tasks.length,
    });

    return tasks;
  }

  /**
   * Assign tasks to best-suited bots
   */
  assignTasks(session: CollaborationSession): void {
    for (const task of session.tasks) {
      if (task.status !== 'pending') continue;

      // Find best bot for this task
      const bestBot = this.findBestBot(task);
      if (bestBot) {
        task.assignedBot = bestBot.botId;
        task.status = 'assigned';
        
        if (!session.participatingBots.includes(bestBot.botId)) {
          session.participatingBots.push(bestBot.botId);
        }

        log.info('[Orchestrator] Task assigned', {
          taskId: task.id,
          botId: bestBot.botId,
          botName: bestBot.botName,
        });
      } else {
        log.warn('[Orchestrator] No suitable bot found', {
          taskId: task.id,
          requiredSkills: task.requiredSkills,
        });
      }
    }
  }

  /**
   * Find best bot for a task based on skills and availability
   */
  private findBestBot(task: Task): BotCapability | null {
    let bestBot: BotCapability | null = null;
    let bestScore = 0;

    for (const bot of this.availableBots.values()) {
      if (bot.availability !== 'available') continue;

      // Calculate match score
      const matchingSkills = task.requiredSkills.filter(skill =>
        bot.skills.includes(skill)
      ).length;

      const skillScore = matchingSkills / task.requiredSkills.length;
      const loadScore = (100 - bot.currentLoad) / 100;
      const totalScore = skillScore * 0.7 + loadScore * 0.3;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestBot = bot;
      }
    }

    return bestBot;
  }

  /**
   * Execute session tasks
   */
  async executeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'executing';

    log.info('[Orchestrator] Executing session', {
      sessionId,
      taskCount: session.tasks.length,
    });

    // Execute tasks respecting dependencies
    await this.executeTasks(session);

    session.status = 'completed';
    session.endTime = new Date();

    log.info('[Orchestrator] Session completed', {
      sessionId,
      duration: session.endTime.getTime() - session.startTime.getTime(),
    });
  }

  /**
   * Execute tasks in correct order (respecting dependencies)
   */
  private async executeTasks(session: CollaborationSession): Promise<void> {
    const completedTasks = new Set<string>();

    while (completedTasks.size < session.tasks.length) {
      const readyTasks = session.tasks.filter(
        task =>
          task.status === 'assigned' &&
          task.dependencies.every(dep => completedTasks.has(dep))
      );

      if (readyTasks.length === 0) {
        // Check if there are any tasks still pending
        const pendingTasks = session.tasks.filter(
          task => task.status !== 'completed' && task.status !== 'failed'
        );
        
        if (pendingTasks.length > 0) {
          log.warn('[Orchestrator] Circular dependency or unassigned tasks', {
            sessionId: session.id,
          });
        }
        break;
      }

      // Execute ready tasks in parallel
      await Promise.all(
        readyTasks.map(task => this.executeTask(session, task))
      );

      // Mark completed
      for (const task of readyTasks) {
        if (task.status === 'completed') {
          completedTasks.add(task.id);
        }
      }
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    session: CollaborationSession,
    task: Task
  ): Promise<void> {
    task.status = 'in_progress';
    task.startTime = new Date();

    log.info('[Orchestrator] Executing task', {
      sessionId: session.id,
      taskId: task.id,
      botId: task.assignedBot,
    });

    try {
      // This is where the actual bot execution would happen
      // For now, simulate with delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Store result in shared context
      const result = {
        taskId: task.id,
        description: task.description,
        completedBy: task.assignedBot,
        output: `Task "${task.description}" completed successfully`,
      };

      task.result = result;
      task.status = 'completed';
      task.endTime = new Date();

      // Share result with other bots
      session.sharedContext.set(task.id, result);

      log.info('[Orchestrator] Task completed', {
        taskId: task.id,
        duration: task.endTime.getTime() - (task.startTime?.getTime() || 0),
      });
    } catch (error: any) {
      task.status = 'failed';
      task.endTime = new Date();
      
      log.error('[Orchestrator] Task failed', {
        taskId: task.id,
        error: error.message,
      });
    }
  }

  /**
   * Get session status
   */
  getSessionStatus(sessionId: string): CollaborationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Share context between bots
   */
  shareContext(sessionId: string, key: string, value: any): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.sharedContext.set(key, value);
      log.info('[Orchestrator] Context shared', {
        sessionId,
        key,
      });
    }
  }

  /**
   * Get shared context
   */
  getSharedContext(sessionId: string, key?: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (key) {
      return session.sharedContext.get(key);
    }

    // Return all context
    return Object.fromEntries(session.sharedContext);
  }

  /**
   * Format session result for display
   */
  formatSessionResult(session: CollaborationSession): string {
    let output = `🤝 **Multi-Bot Collaboration Result**\n\n`;
    output += `📋 Objective: ${session.objective}\n`;
    output += `⏱️ Duration: ${this.formatDuration(session)}\n`;
    output += `🤖 Bots involved: ${session.participatingBots.length}\n\n`;

    output += `📊 **Tasks Completed:**\n\n`;

    for (const task of session.tasks) {
      const emoji = task.status === 'completed' ? '✅' : task.status === 'failed' ? '❌' : '⏳';
      const bot = this.availableBots.get(task.assignedBot || '');
      
      output += `${emoji} **${task.description}**\n`;
      output += `   Bot: ${bot?.botName || 'Unassigned'}\n`;
      
      if (task.result) {
        output += `   Result: ${task.result.output}\n`;
      }
      
      if (task.startTime && task.endTime) {
        const duration = task.endTime.getTime() - task.startTime.getTime();
        output += `   Time: ${(duration / 1000).toFixed(1)}s\n`;
      }
      
      output += `\n`;
    }

    return output;
  }

  private formatDuration(session: CollaborationSession): string {
    const endTime = session.endTime || new Date();
    const duration = endTime.getTime() - session.startTime.getTime();
    return `${(duration / 1000).toFixed(1)}s`;
  }
}

// Singleton instance
let orchestratorInstance: MultiBotOrchestrator | null = null;

export function getOrchestrator(): MultiBotOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new MultiBotOrchestrator();
  }
  return orchestratorInstance;
}

export const orchestrator = getOrchestrator();

import * as cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';
import { log } from '../logger';
import { CronJob, CronJobCreate, ScheduledTask, RelativeTime } from './types';
import { getSlackApp } from '../tools/slack-messaging';

/**
 * Cron Manager
 *
 * Manages scheduled tasks with persistence
 */
export class CronManager {
  private db: Database.Database;
  private jobs: Map<string, ReturnType<typeof cron.schedule>> = new Map();

  constructor() {
    const dbPath = path.join(process.env.DATA_DIR || './data', 'ulf.db');
    this.db = new Database(dbPath);

    this.initTable();
    log.info('[CronManager] Initialized');
  }

  /**
   * Initialize cron_jobs table
   */
  private initTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cron_jobs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        expression TEXT NOT NULL,
        task_type TEXT NOT NULL,
        task_data TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        last_run TEXT,
        next_run TEXT,
        user_id TEXT,
        metadata TEXT
      )
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cron_jobs_enabled ON cron_jobs(enabled);
      CREATE INDEX IF NOT EXISTS idx_cron_jobs_user_id ON cron_jobs(user_id);
    `);

    log.info('[CronManager] Database table initialized');
  }

  /**
   * Parse relative time expressions
   * Examples: "in 30 minutes", "in 2 hours", "in 1 day"
   */
  parseRelativeTime(expression: string): RelativeTime | null {
    const patterns = [
      { regex: /in\s+(\d+)\s+second(s)?/i, unit: 'seconds' as const },
      { regex: /in\s+(\d+)\s+minute(s)?/i, unit: 'minutes' as const },
      { regex: /in\s+(\d+)\s+hour(s)?/i, unit: 'hours' as const },
      { regex: /in\s+(\d+)\s+day(s)?/i, unit: 'days' as const }
    ];

    for (const pattern of patterns) {
      const match = expression.match(pattern.regex);
      if (match) {
        return {
          value: parseInt(match[1]),
          unit: pattern.unit
        };
      }
    }

    return null;
  }

  /**
   * Convert relative time to cron expression (one-time execution)
   */
  relativeToCron(relative: RelativeTime): { expression: string; executeAt: Date } {
    const now = new Date();
    const executeAt = new Date(now);

    switch (relative.unit) {
      case 'seconds':
        executeAt.setSeconds(now.getSeconds() + relative.value);
        break;
      case 'minutes':
        executeAt.setMinutes(now.getMinutes() + relative.value);
        break;
      case 'hours':
        executeAt.setHours(now.getHours() + relative.value);
        break;
      case 'days':
        executeAt.setDate(now.getDate() + relative.value);
        break;
    }

    // Create one-time cron expression
    const minute = executeAt.getMinutes();
    const hour = executeAt.getHours();
    const day = executeAt.getDate();
    const month = executeAt.getMonth() + 1;

    return {
      expression: `${minute} ${hour} ${day} ${month} *`,
      executeAt
    };
  }

  /**
   * Add a new cron job
   */
  async addJob(jobCreate: CronJobCreate): Promise<CronJob> {
    const id = uuidv4();
    const now = new Date().toISOString();

    // Parse expression (could be relative or cron)
    let expression = jobCreate.expression;
    let nextRun: string | undefined;

    const relative = this.parseRelativeTime(jobCreate.expression);
    if (relative) {
      const { expression: cronExpr, executeAt } = this.relativeToCron(relative);
      expression = cronExpr;
      nextRun = executeAt.toISOString();
      log.info('[CronManager] Parsed relative time', {
        original: jobCreate.expression,
        cron: expression,
        executeAt: nextRun
      });
    }

    // Validate cron expression
    if (!cron.validate(expression)) {
      throw new Error(`Invalid cron expression: ${expression}`);
    }

    const job: CronJob = {
      id,
      name: jobCreate.name,
      expression,
      task: jobCreate.task,
      enabled: true,
      createdAt: now,
      nextRun,
      userId: jobCreate.userId,
      metadata: jobCreate.metadata
    };

    // Save to database
    const stmt = this.db.prepare(`
      INSERT INTO cron_jobs (
        id, name, expression, task_type, task_data, enabled,
        created_at, next_run, user_id, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      job.id,
      job.name,
      job.expression,
      job.task.type,
      JSON.stringify(job.task.data),
      job.enabled ? 1 : 0,
      job.createdAt,
      job.nextRun || null,
      job.userId || null,
      job.metadata ? JSON.stringify(job.metadata) : null
    );

    // Schedule the job
    await this.scheduleJob(job);

    log.info('[CronManager] Job added', {
      id: job.id,
      name: job.name,
      expression: job.expression
    });

    return job;
  }

  /**
   * Schedule a job with node-cron
   */
  private async scheduleJob(job: CronJob): Promise<void> {
    if (!job.enabled) {
      return;
    }

    const task = cron.schedule(job.expression, async () => {
      log.info('[CronManager] Executing job', { id: job.id, name: job.name });

      try {
        await this.executeTask(job);

        // Update last run
        const now = new Date().toISOString();
        this.db.prepare('UPDATE cron_jobs SET last_run = ? WHERE id = ?')
          .run(now, job.id);

        log.info('[CronManager] Job executed successfully', { id: job.id });

        // If it was a one-time job (relative time), disable it
        const relative = this.parseRelativeTime(job.expression);
        if (relative) {
          log.info('[CronManager] One-time job completed, disabling', { id: job.id });
          await this.pauseJob(job.id);
        }
      } catch (error: any) {
        log.error('[CronManager] Job execution failed', {
          id: job.id,
          error: error.message
        });
      }
    });

    this.jobs.set(job.id, task);
  }

  /**
   * Execute the scheduled task
   */
  private async executeTask(job: CronJob): Promise<void> {
    switch (job.task.type) {
      case 'slack_message':
        await this.executeSlackMessage(job.task.data);
        break;

      case 'custom':
        log.info('[CronManager] Custom task type not implemented yet', {
          jobId: job.id
        });
        break;

      default:
        throw new Error(`Unknown task type: ${job.task.type}`);
    }
  }

  /**
   * Execute Slack message task
   */
  private async executeSlackMessage(data: any): Promise<void> {
    const { channel, message, thread_ts } = data;

    try {
      const app = getSlackApp();

      await app.client.chat.postMessage({
        channel,
        text: message,
        thread_ts,
        unfurl_links: false,
        unfurl_media: false
      });

      log.info('[CronManager] Slack message sent', { channel });
    } catch (error: any) {
      log.error('[CronManager] Failed to send Slack message', {
        error: error.message,
        channel
      });
      throw error;
    }
  }

  /**
   * Remove a job
   */
  async removeJob(id: string): Promise<boolean> {
    // Stop the cron task
    const task = this.jobs.get(id);
    if (task) {
      task.stop();
      this.jobs.delete(id);
    }

    // Delete from database
    const result = this.db.prepare('DELETE FROM cron_jobs WHERE id = ?').run(id);

    log.info('[CronManager] Job removed', { id, deleted: result.changes > 0 });

    return result.changes > 0;
  }

  /**
   * Pause a job
   */
  async pauseJob(id: string): Promise<boolean> {
    // Stop the cron task
    const task = this.jobs.get(id);
    if (task) {
      task.stop();
      this.jobs.delete(id);
    }

    // Update database
    const result = this.db.prepare('UPDATE cron_jobs SET enabled = 0 WHERE id = ?')
      .run(id);

    log.info('[CronManager] Job paused', { id });

    return result.changes > 0;
  }

  /**
   * Resume a job
   */
  async resumeJob(id: string): Promise<boolean> {
    // Update database
    const result = this.db.prepare('UPDATE cron_jobs SET enabled = 1 WHERE id = ?')
      .run(id);

    if (result.changes === 0) {
      return false;
    }

    // Load and reschedule
    const job = this.getJob(id);
    if (job) {
      await this.scheduleJob(job);
      log.info('[CronManager] Job resumed', { id });
    }

    return true;
  }

  /**
   * Get a job by ID
   */
  getJob(id: string): CronJob | null {
    const row = this.db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id) as any;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      expression: row.expression,
      task: {
        type: row.task_type,
        data: JSON.parse(row.task_data)
      },
      enabled: Boolean(row.enabled),
      createdAt: row.created_at,
      lastRun: row.last_run,
      nextRun: row.next_run,
      userId: row.user_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }

  /**
   * List all jobs
   */
  listJobs(userId?: string): CronJob[] {
    let query = 'SELECT * FROM cron_jobs';
    const params: any[] = [];

    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY created_at DESC';

    const rows = this.db.prepare(query).all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      expression: row.expression,
      task: {
        type: row.task_type,
        data: JSON.parse(row.task_data)
      },
      enabled: Boolean(row.enabled),
      createdAt: row.created_at,
      lastRun: row.last_run,
      nextRun: row.next_run,
      userId: row.user_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  /**
   * Load and schedule all enabled jobs from database
   */
  async loadJobs(): Promise<void> {
    const jobs = this.listJobs();
    const enabledJobs = jobs.filter(job => job.enabled);

    log.info('[CronManager] Loading jobs from database', {
      total: jobs.length,
      enabled: enabledJobs.length
    });

    for (const job of enabledJobs) {
      try {
        await this.scheduleJob(job);
      } catch (error: any) {
        log.error('[CronManager] Failed to schedule job', {
          id: job.id,
          error: error.message
        });
      }
    }

    log.info('[CronManager] Jobs loaded', { count: enabledJobs.length });
  }

  /**
   * Shutdown - stop all jobs
   */
  shutdown(): void {
    log.info('[CronManager] Shutting down', { activeJobs: this.jobs.size });

    for (const [id, task] of this.jobs.entries()) {
      task.stop();
    }

    this.jobs.clear();
  }
}

// Export singleton
let cronManagerInstance: CronManager | null = null;

export function getCronManager(): CronManager {
  if (!cronManagerInstance) {
    cronManagerInstance = new CronManager();
  }
  return cronManagerInstance;
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronManager = void 0;
exports.getCronManager = getCronManager;
const cron = __importStar(require("node-cron"));
const uuid_1 = require("uuid");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../logger");
const slack_messaging_1 = require("../tools/slack-messaging");
/**
 * Cron Manager
 *
 * Manages scheduled tasks with persistence
 */
class CronManager {
    db;
    jobs = new Map();
    constructor() {
        const dbPath = path_1.default.join(process.env.DATA_DIR || './data', 'ulf.db');
        this.db = new better_sqlite3_1.default(dbPath);
        this.initTable();
        logger_1.log.info('[CronManager] Initialized');
    }
    /**
     * Initialize cron_jobs table
     */
    initTable() {
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
        logger_1.log.info('[CronManager] Database table initialized');
    }
    /**
     * Parse relative time expressions
     * Examples: "in 30 minutes", "in 2 hours", "in 1 day"
     */
    parseRelativeTime(expression) {
        const patterns = [
            { regex: /in\s+(\d+)\s+second(s)?/i, unit: 'seconds' },
            { regex: /in\s+(\d+)\s+minute(s)?/i, unit: 'minutes' },
            { regex: /in\s+(\d+)\s+hour(s)?/i, unit: 'hours' },
            { regex: /in\s+(\d+)\s+day(s)?/i, unit: 'days' }
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
    relativeToCron(relative) {
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
    async addJob(jobCreate) {
        const id = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        // Parse expression (could be relative or cron)
        let expression = jobCreate.expression;
        let nextRun;
        const relative = this.parseRelativeTime(jobCreate.expression);
        if (relative) {
            const { expression: cronExpr, executeAt } = this.relativeToCron(relative);
            expression = cronExpr;
            nextRun = executeAt.toISOString();
            logger_1.log.info('[CronManager] Parsed relative time', {
                original: jobCreate.expression,
                cron: expression,
                executeAt: nextRun
            });
        }
        // Validate cron expression
        if (!cron.validate(expression)) {
            throw new Error(`Invalid cron expression: ${expression}`);
        }
        const job = {
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
        stmt.run(job.id, job.name, job.expression, job.task.type, JSON.stringify(job.task.data), job.enabled ? 1 : 0, job.createdAt, job.nextRun || null, job.userId || null, job.metadata ? JSON.stringify(job.metadata) : null);
        // Schedule the job
        await this.scheduleJob(job);
        logger_1.log.info('[CronManager] Job added', {
            id: job.id,
            name: job.name,
            expression: job.expression
        });
        return job;
    }
    /**
     * Schedule a job with node-cron
     */
    async scheduleJob(job) {
        if (!job.enabled) {
            return;
        }
        const task = cron.schedule(job.expression, async () => {
            logger_1.log.info('[CronManager] Executing job', { id: job.id, name: job.name });
            try {
                await this.executeTask(job);
                // Update last run
                const now = new Date().toISOString();
                this.db.prepare('UPDATE cron_jobs SET last_run = ? WHERE id = ?')
                    .run(now, job.id);
                logger_1.log.info('[CronManager] Job executed successfully', { id: job.id });
                // If it was a one-time job (relative time), disable it
                const relative = this.parseRelativeTime(job.expression);
                if (relative) {
                    logger_1.log.info('[CronManager] One-time job completed, disabling', { id: job.id });
                    await this.pauseJob(job.id);
                }
            }
            catch (error) {
                logger_1.log.error('[CronManager] Job execution failed', {
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
    async executeTask(job) {
        switch (job.task.type) {
            case 'slack_message':
                await this.executeSlackMessage(job.task.data);
                break;
            case 'custom':
                logger_1.log.info('[CronManager] Custom task type not implemented yet', {
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
    async executeSlackMessage(data) {
        const { channel, message, thread_ts } = data;
        try {
            const app = (0, slack_messaging_1.getSlackApp)();
            await app.client.chat.postMessage({
                channel,
                text: message,
                thread_ts,
                unfurl_links: false,
                unfurl_media: false
            });
            logger_1.log.info('[CronManager] Slack message sent', { channel });
        }
        catch (error) {
            logger_1.log.error('[CronManager] Failed to send Slack message', {
                error: error.message,
                channel
            });
            throw error;
        }
    }
    /**
     * Remove a job
     */
    async removeJob(id) {
        // Stop the cron task
        const task = this.jobs.get(id);
        if (task) {
            task.stop();
            this.jobs.delete(id);
        }
        // Delete from database
        const result = this.db.prepare('DELETE FROM cron_jobs WHERE id = ?').run(id);
        logger_1.log.info('[CronManager] Job removed', { id, deleted: result.changes > 0 });
        return result.changes > 0;
    }
    /**
     * Pause a job
     */
    async pauseJob(id) {
        // Stop the cron task
        const task = this.jobs.get(id);
        if (task) {
            task.stop();
            this.jobs.delete(id);
        }
        // Update database
        const result = this.db.prepare('UPDATE cron_jobs SET enabled = 0 WHERE id = ?')
            .run(id);
        logger_1.log.info('[CronManager] Job paused', { id });
        return result.changes > 0;
    }
    /**
     * Resume a job
     */
    async resumeJob(id) {
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
            logger_1.log.info('[CronManager] Job resumed', { id });
        }
        return true;
    }
    /**
     * Get a job by ID
     */
    getJob(id) {
        const row = this.db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id);
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
    listJobs(userId) {
        let query = 'SELECT * FROM cron_jobs';
        const params = [];
        if (userId) {
            query += ' WHERE user_id = ?';
            params.push(userId);
        }
        query += ' ORDER BY created_at DESC';
        const rows = this.db.prepare(query).all(...params);
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
    async loadJobs() {
        const jobs = this.listJobs();
        const enabledJobs = jobs.filter(job => job.enabled);
        logger_1.log.info('[CronManager] Loading jobs from database', {
            total: jobs.length,
            enabled: enabledJobs.length
        });
        for (const job of enabledJobs) {
            try {
                await this.scheduleJob(job);
            }
            catch (error) {
                logger_1.log.error('[CronManager] Failed to schedule job', {
                    id: job.id,
                    error: error.message
                });
            }
        }
        logger_1.log.info('[CronManager] Jobs loaded', { count: enabledJobs.length });
    }
    /**
     * Shutdown - stop all jobs
     */
    shutdown() {
        logger_1.log.info('[CronManager] Shutting down', { activeJobs: this.jobs.size });
        for (const [id, task] of this.jobs.entries()) {
            task.stop();
        }
        this.jobs.clear();
    }
}
exports.CronManager = CronManager;
// Export singleton
let cronManagerInstance = null;
function getCronManager() {
    if (!cronManagerInstance) {
        cronManagerInstance = new CronManager();
    }
    return cronManagerInstance;
}

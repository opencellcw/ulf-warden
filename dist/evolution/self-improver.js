"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SelfImprover = void 0;
const uuid_1 = require("uuid");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const logger_1 = require("../logger");
const guardrails_1 = require("./guardrails");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class SelfImprover {
    db;
    claude;
    constructor(claude) {
        const dbPath = path_1.default.join(process.env.DATA_DIR || './data', 'ulf.db');
        this.db = new better_sqlite3_1.default(dbPath);
        this.claude = claude;
        this.initTable();
    }
    initTable() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS improvement_proposals (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        risk TEXT NOT NULL,
        files TEXT NOT NULL,
        branch TEXT NOT NULL,
        pr_url TEXT,
        pr_number INTEGER,
        status TEXT NOT NULL,
        proposed_by TEXT NOT NULL,
        proposed_at TEXT NOT NULL,
        approved_by TEXT,
        rejected_by TEXT,
        deployed_at TEXT,
        implementation_plan TEXT NOT NULL,
        estimated_changes INTEGER NOT NULL,
        dependencies TEXT,
        attempts INTEGER DEFAULT 0,
        errors TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_proposals_status ON improvement_proposals(status);
      CREATE INDEX IF NOT EXISTS idx_proposals_date ON improvement_proposals(proposed_at);

      CREATE TABLE IF NOT EXISTS approval_requests (
        proposal_id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        message_id TEXT,
        requested_at TEXT NOT NULL,
        expires_at TEXT,
        FOREIGN KEY (proposal_id) REFERENCES improvement_proposals(id)
      );
    `);
    }
    async proposeImprovement(idea) {
        logger_1.log.info('[SelfImprover] Analyzing improvement idea', { idea: idea.substring(0, 100) });
        const stats = this.getStats();
        if (stats.todayProposed >= 5) {
            throw new Error('Rate limit: Maximum 5 proposals per day reached');
        }
        const prompt = `You are an AI agent proposing a self-improvement.

Idea: ${idea}

Analyze this idea and propose a concrete implementation plan.

Return ONLY a JSON object (no markdown, no explanation):
{
  "type": "feature",
  "title": "Add /status command",
  "description": "Implement a status command that shows bot uptime and version",
  "reasoning": "Users need a quick way to check if the bot is healthy",
  "files": ["src/commands/status.ts"],
  "implementationPlan": "1. Create status.ts\\n2. Export status function\\n3. Add to command registry",
  "estimatedChanges": 50
}`;
        const response = await this.claude.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [{
                    role: 'user',
                    content: prompt
                }]
        });
        const content = response.content[0];
        if (content.type !== 'text') {
            throw new Error('Unexpected response type');
        }
        const proposalData = JSON.parse(content.text);
        const validation = (0, guardrails_1.validateProposal)(proposalData.files, stats.todayProposed);
        if (!validation.valid) {
            throw new Error(validation.reason);
        }
        const risk = (0, guardrails_1.assessRisk)(proposalData.files);
        const id = (0, uuid_1.v4)();
        const shortId = id.split('-')[0];
        const branch = `auto/improvement-${shortId}`;
        const proposal = {
            id,
            type: proposalData.type,
            title: proposalData.title,
            description: proposalData.description,
            reasoning: proposalData.reasoning,
            risk,
            files: proposalData.files,
            branch,
            status: 'proposed',
            proposedBy: 'self-improver',
            proposedAt: new Date().toISOString(),
            implementationPlan: proposalData.implementationPlan,
            estimatedChanges: proposalData.estimatedChanges,
            attempts: 0
        };
        this.saveProposal(proposal);
        logger_1.log.info('[SelfImprover] Improvement proposed', {
            id: proposal.id,
            title: proposal.title,
            risk: proposal.risk,
            files: proposal.files.length
        });
        return proposal;
    }
    async implementProposal(proposal) {
        logger_1.log.info('[SelfImprover] Implementing proposal', { id: proposal.id });
        proposal.attempts++;
        this.updateProposal(proposal.id, { attempts: proposal.attempts });
        try {
            // Create branch
            await execAsync(`git checkout main`);
            await execAsync(`git pull`);
            await execAsync(`git checkout -b ${proposal.branch}`);
            logger_1.log.info('[SelfImprover] Created branch', { branch: proposal.branch });
            // Generate implementation
            const implementationPrompt = `Implement this improvement:

Title: ${proposal.title}
Files: ${proposal.files.join(', ')}
Plan: ${proposal.implementationPlan}

Generate complete TypeScript code. Return ONLY JSON:
{
  "files": {
    "src/commands/status.ts": "export function status() { return 'OK'; }"
  }
}`;
            const response = await this.claude.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4000,
                messages: [{
                        role: 'user',
                        content: implementationPrompt
                    }]
            });
            const content = response.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response');
            }
            const { files } = JSON.parse(content.text);
            // Write files
            for (const [filePath, fileContent] of Object.entries(files)) {
                const dir = path_1.default.dirname(filePath);
                if (!fs_1.default.existsSync(dir)) {
                    fs_1.default.mkdirSync(dir, { recursive: true });
                }
                fs_1.default.writeFileSync(filePath, fileContent);
                logger_1.log.info('[SelfImprover] Created file', { file: filePath });
            }
            // Build
            await execAsync('npm run build');
            logger_1.log.info('[SelfImprover] Build successful');
            // Commit and push
            await execAsync(`git add ${proposal.files.join(' ')}`);
            await execAsync(`git commit -m "${proposal.title}

${proposal.description}

Auto-generated by Self-Improver
Risk: ${proposal.risk}
Proposal ID: ${proposal.id}"`);
            await execAsync(`git push origin ${proposal.branch}`);
            logger_1.log.info('[SelfImprover] Pushed branch');
            // Create PR
            const prNumber = await this.createPullRequest(proposal);
            proposal.prNumber = prNumber;
            proposal.prUrl = `https://github.com/lucaspressi/ulfberht-warden/pull/${prNumber}`;
            this.updateProposal(proposal.id, {
                prUrl: proposal.prUrl,
                prNumber: proposal.prNumber
            });
            logger_1.log.info('[SelfImprover] Implementation complete', { prUrl: proposal.prUrl });
        }
        catch (error) {
            logger_1.log.error('[SelfImprover] Implementation failed', { error: error.message });
            const errors = proposal.errors || [];
            errors.push(error.message);
            this.updateProposal(proposal.id, { errors, status: 'failed' });
            await execAsync('git checkout main').catch(() => { });
            throw error;
        }
    }
    async createPullRequest(proposal) {
        const requiredApprovals = (0, guardrails_1.getRequiredApprovals)(proposal.risk);
        const body = `## ${proposal.type.toUpperCase()}: ${proposal.title}

${proposal.description}

### Reasoning
${proposal.reasoning}

### Risk Level: ${proposal.risk.toUpperCase()}
${requiredApprovals} approval(s) required

### Implementation Plan
${proposal.implementationPlan}

### Files Modified
${proposal.files.map(f => `- ${f}`).join('\n')}

### Metadata
- Proposal ID: ${proposal.id}
- Estimated changes: ${proposal.estimatedChanges} lines
- Auto-generated by Self-Improver 🤖

---
⚠️ **IMPORTANT**: This is an auto-generated PR. Review carefully before merging.`;
        const { stdout } = await execAsync(`gh pr create --title "${proposal.title}" --body "${body.replace(/"/g, '\\"')}" --base main --head ${proposal.branch}`);
        const match = stdout.match(/\/pull\/(\d+)/);
        if (!match) {
            throw new Error('Failed to extract PR number');
        }
        return parseInt(match[1]);
    }
    async requestApproval(proposal, channel) {
        const request = {
            proposalId: proposal.id,
            channel,
            requestedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        this.db.prepare(`
      INSERT INTO approval_requests (proposal_id, channel, requested_at, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(request.proposalId, request.channel, request.requestedAt, request.expiresAt);
        logger_1.log.info('[SelfImprover] Approval requested', { proposalId: proposal.id, channel });
    }
    async handleApproval(proposalId, approved, userId) {
        const proposal = this.getProposal(proposalId);
        if (!proposal) {
            throw new Error(`Proposal ${proposalId} not found`);
        }
        if (approved) {
            const approvedBy = proposal.approvedBy || [];
            if (!approvedBy.includes(userId)) {
                approvedBy.push(userId);
            }
            const requiredApprovals = (0, guardrails_1.getRequiredApprovals)(proposal.risk);
            if (approvedBy.length >= requiredApprovals) {
                this.updateProposal(proposalId, {
                    status: 'approved',
                    approvedBy
                });
                logger_1.log.info('[SelfImprover] Proposal approved', { proposalId, approvals: approvedBy.length });
            }
            else {
                this.updateProposal(proposalId, { approvedBy });
                logger_1.log.info('[SelfImprover] Approval recorded', {
                    proposalId,
                    approvals: approvedBy.length,
                    required: requiredApprovals
                });
            }
        }
        else {
            this.updateProposal(proposalId, {
                status: 'rejected',
                rejectedBy: userId
            });
            logger_1.log.info('[SelfImprover] Proposal rejected', { proposalId, by: userId });
        }
    }
    async deploy(proposal) {
        if (proposal.status !== 'approved') {
            throw new Error('Only approved proposals can be deployed');
        }
        logger_1.log.info('[SelfImprover] Deploying proposal', { id: proposal.id });
        try {
            await execAsync(`gh pr merge ${proposal.prNumber} --squash --delete-branch`);
            this.updateProposal(proposal.id, {
                status: 'deployed',
                deployedAt: new Date().toISOString()
            });
            logger_1.log.info('[SelfImprover] Deployed', { id: proposal.id, prNumber: proposal.prNumber });
        }
        catch (error) {
            logger_1.log.error('[SelfImprover] Deployment failed', { error: error.message });
            throw error;
        }
    }
    getProposal(id) {
        const row = this.db.prepare('SELECT * FROM improvement_proposals WHERE id = ?').get(id);
        if (!row)
            return null;
        return this.rowToProposal(row);
    }
    listProposals(status) {
        let query = 'SELECT * FROM improvement_proposals';
        const params = [];
        if (status) {
            query += ' WHERE status = ?';
            params.push(status);
        }
        query += ' ORDER BY proposed_at DESC';
        const rows = this.db.prepare(query).all(...params);
        return rows.map(row => this.rowToProposal(row));
    }
    getStats() {
        const stats = this.db.prepare(`
      SELECT
        COUNT(*) as totalProposed,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as totalApproved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as totalRejected,
        SUM(CASE WHEN status = 'deployed' THEN 1 ELSE 0 END) as totalDeployed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as totalFailed,
        SUM(CASE WHEN DATE(proposed_at) = DATE('now') THEN 1 ELSE 0 END) as todayProposed
      FROM improvement_proposals
    `).get();
        const successRate = stats.totalProposed > 0
            ? (stats.totalDeployed / stats.totalProposed) * 100
            : 0;
        return {
            totalProposed: stats.totalProposed || 0,
            totalApproved: stats.totalApproved || 0,
            totalRejected: stats.totalRejected || 0,
            totalDeployed: stats.totalDeployed || 0,
            totalFailed: stats.totalFailed || 0,
            successRate: Math.round(successRate),
            todayProposed: stats.todayProposed || 0
        };
    }
    saveProposal(proposal) {
        this.db.prepare(`
      INSERT INTO improvement_proposals (
        id, type, title, description, reasoning, risk, files, branch,
        pr_url, pr_number, status, proposed_by, proposed_at, approved_by,
        rejected_by, deployed_at, implementation_plan, estimated_changes,
        dependencies, attempts, errors
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(proposal.id, proposal.type, proposal.title, proposal.description, proposal.reasoning, proposal.risk, JSON.stringify(proposal.files), proposal.branch, proposal.prUrl || null, proposal.prNumber || null, proposal.status, proposal.proposedBy, proposal.proposedAt, JSON.stringify(proposal.approvedBy || []), proposal.rejectedBy || null, proposal.deployedAt || null, proposal.implementationPlan, proposal.estimatedChanges, JSON.stringify(proposal.dependencies || []), proposal.attempts, JSON.stringify(proposal.errors || []));
    }
    updateProposal(id, updates) {
        const sets = [];
        const values = [];
        for (const [key, value] of Object.entries(updates)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            sets.push(`${snakeKey} = ?`);
            if (Array.isArray(value)) {
                values.push(JSON.stringify(value));
            }
            else {
                values.push(value);
            }
        }
        values.push(id);
        this.db.prepare(`
      UPDATE improvement_proposals
      SET ${sets.join(', ')}
      WHERE id = ?
    `).run(...values);
    }
    rowToProposal(row) {
        return {
            id: row.id,
            type: row.type,
            title: row.title,
            description: row.description,
            reasoning: row.reasoning,
            risk: row.risk,
            files: JSON.parse(row.files),
            branch: row.branch,
            prUrl: row.pr_url,
            prNumber: row.pr_number,
            status: row.status,
            proposedBy: row.proposed_by,
            proposedAt: row.proposed_at,
            approvedBy: row.approved_by ? JSON.parse(row.approved_by) : undefined,
            rejectedBy: row.rejected_by,
            deployedAt: row.deployed_at,
            implementationPlan: row.implementation_plan,
            estimatedChanges: row.estimated_changes,
            dependencies: row.dependencies ? JSON.parse(row.dependencies) : undefined,
            attempts: row.attempts,
            errors: row.errors ? JSON.parse(row.errors) : undefined
        };
    }
}
exports.SelfImprover = SelfImprover;

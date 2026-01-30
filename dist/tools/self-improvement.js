"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SELF_IMPROVEMENT_TOOLS = void 0;
exports.getSelfImprover = getSelfImprover;
exports.proposeSelfImprovement = proposeSelfImprovement;
exports.implementProposal = implementProposal;
exports.requestApproval = requestApproval;
exports.listPendingImprovements = listPendingImprovements;
exports.approveImprovement = approveImprovement;
exports.rejectImprovement = rejectImprovement;
exports.deployImprovement = deployImprovement;
exports.getImprovementStats = getImprovementStats;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const self_improver_1 = require("../evolution/self-improver");
const logger_1 = require("../logger");
let improverInstance = null;
function getSelfImprover() {
    if (!improverInstance) {
        const claude = new sdk_1.default({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
        improverInstance = new self_improver_1.SelfImprover(claude);
    }
    return improverInstance;
}
/**
 * Propose a self-improvement
 */
async function proposeSelfImprovement(input) {
    const { idea } = input;
    if (!idea) {
        return '❌ Missing required parameter: idea';
    }
    try {
        const improver = getSelfImprover();
        const proposal = await improver.proposeImprovement(idea);
        return `✅ **Improvement Proposed**

**ID:** \`${proposal.id}\`
**Title:** ${proposal.title}
**Type:** ${proposal.type}
**Risk:** ${proposal.risk}

**Description:**
${proposal.description}

**Reasoning:**
${proposal.reasoning}

**Files to be modified:**
${proposal.files.map(f => `- ${f}`).join('\n')}

**Implementation Plan:**
${proposal.implementationPlan}

**Estimated changes:** ${proposal.estimatedChanges} lines

Use \`implement_proposal\` to start implementation.`;
    }
    catch (error) {
        logger_1.log.error('[SelfImprovement] Failed to propose', { error: error.message });
        return `❌ Failed to propose improvement: ${error.message}`;
    }
}
/**
 * Implement a proposal
 */
async function implementProposal(input) {
    const { proposal_id } = input;
    if (!proposal_id) {
        return '❌ Missing required parameter: proposal_id';
    }
    try {
        const improver = getSelfImprover();
        const proposal = improver.getProposal(proposal_id);
        if (!proposal) {
            return `❌ Proposal \`${proposal_id}\` not found`;
        }
        if (proposal.status !== 'proposed') {
            return `❌ Proposal is ${proposal.status}, cannot implement`;
        }
        await improver.implementProposal(proposal);
        const updatedProposal = improver.getProposal(proposal_id);
        return `✅ **Implementation Complete**

**Branch:** \`${updatedProposal.branch}\`
**PR:** ${updatedProposal.prUrl}

The code has been implemented and a Pull Request has been created.
Use \`request_approval\` to ask for human review.`;
    }
    catch (error) {
        logger_1.log.error('[SelfImprovement] Implementation failed', { error: error.message });
        return `❌ Implementation failed: ${error.message}`;
    }
}
/**
 * Request approval for a proposal
 */
async function requestApproval(input) {
    const { proposal_id, channel } = input;
    if (!proposal_id || !channel) {
        return '❌ Missing required parameters: proposal_id and channel';
    }
    try {
        const improver = getSelfImprover();
        const proposal = improver.getProposal(proposal_id);
        if (!proposal) {
            return `❌ Proposal \`${proposal_id}\` not found`;
        }
        await improver.requestApproval(proposal, channel);
        return `✅ **Approval Requested**

**Proposal:** ${proposal.title}
**PR:** ${proposal.prUrl}
**Risk:** ${proposal.risk}

Waiting for human approval in channel ${channel}.
Humans can approve with: \`approve_improvement ${proposal_id}\``;
    }
    catch (error) {
        logger_1.log.error('[SelfImprovement] Failed to request approval', { error: error.message });
        return `❌ Failed to request approval: ${error.message}`;
    }
}
/**
 * List pending improvements
 */
async function listPendingImprovements(input) {
    try {
        const improver = getSelfImprover();
        const proposals = improver.listProposals('proposed');
        if (proposals.length === 0) {
            return 'ℹ️ No pending improvements.';
        }
        let result = `📋 **Pending Improvements (${proposals.length}):**\n\n`;
        for (const proposal of proposals) {
            result += `**${proposal.title}**\n`;
            result += `  • ID: \`${proposal.id}\`\n`;
            result += `  • Type: ${proposal.type}\n`;
            result += `  • Risk: ${proposal.risk}\n`;
            result += `  • Files: ${proposal.files.length}\n`;
            result += `  • Proposed: ${new Date(proposal.proposedAt).toLocaleString('pt-BR')}\n`;
            if (proposal.prUrl) {
                result += `  • PR: ${proposal.prUrl}\n`;
            }
            result += `\n`;
        }
        return result;
    }
    catch (error) {
        logger_1.log.error('[SelfImprovement] Failed to list', { error: error.message });
        return `❌ Failed to list improvements: ${error.message}`;
    }
}
/**
 * Approve an improvement
 */
async function approveImprovement(input, userId) {
    const { proposal_id } = input;
    if (!proposal_id) {
        return '❌ Missing required parameter: proposal_id';
    }
    if (!userId) {
        return '❌ User ID required for approval';
    }
    try {
        const improver = getSelfImprover();
        await improver.handleApproval(proposal_id, true, userId);
        const proposal = improver.getProposal(proposal_id);
        if (proposal.status === 'approved') {
            return `✅ **Proposal Approved!**

The proposal "${proposal.title}" has been approved and can now be deployed.

Use \`deploy_improvement ${proposal_id}\` to merge the PR.`;
        }
        else {
            const requiredApprovals = proposal.risk === 'high' ? 2 : 1;
            const currentApprovals = proposal.approvedBy?.length || 0;
            return `✅ Approval recorded (${currentApprovals}/${requiredApprovals})

Still waiting for ${requiredApprovals - currentApprovals} more approval(s).`;
        }
    }
    catch (error) {
        logger_1.log.error('[SelfImprovement] Failed to approve', { error: error.message });
        return `❌ Failed to approve: ${error.message}`;
    }
}
/**
 * Reject an improvement
 */
async function rejectImprovement(input, userId) {
    const { proposal_id, reason } = input;
    if (!proposal_id) {
        return '❌ Missing required parameter: proposal_id';
    }
    if (!userId) {
        return '❌ User ID required for rejection';
    }
    try {
        const improver = getSelfImprover();
        await improver.handleApproval(proposal_id, false, userId);
        return `❌ **Proposal Rejected**

The proposal has been rejected by ${userId}.
${reason ? `\nReason: ${reason}` : ''}

The branch and PR will remain for review, but the proposal is now marked as rejected.`;
    }
    catch (error) {
        logger_1.log.error('[SelfImprovement] Failed to reject', { error: error.message });
        return `❌ Failed to reject: ${error.message}`;
    }
}
/**
 * Deploy an approved improvement
 */
async function deployImprovement(input) {
    const { proposal_id } = input;
    if (!proposal_id) {
        return '❌ Missing required parameter: proposal_id';
    }
    try {
        const improver = getSelfImprover();
        const proposal = improver.getProposal(proposal_id);
        if (!proposal) {
            return `❌ Proposal \`${proposal_id}\` not found`;
        }
        if (proposal.status !== 'approved') {
            return `❌ Proposal must be approved before deployment. Current status: ${proposal.status}`;
        }
        await improver.deploy(proposal);
        return `✅ **Deployed Successfully!**

The improvement "${proposal.title}" has been merged to main and deployed.

PR #${proposal.prNumber} has been merged and the branch deleted.`;
    }
    catch (error) {
        logger_1.log.error('[SelfImprovement] Deployment failed', { error: error.message });
        return `❌ Deployment failed: ${error.message}`;
    }
}
/**
 * Get improvement stats
 */
async function getImprovementStats(input) {
    try {
        const improver = getSelfImprover();
        const stats = improver.getStats();
        return `📊 **Self-Improvement Stats**

**Total Proposed:** ${stats.totalProposed}
**Approved:** ${stats.totalApproved}
**Rejected:** ${stats.totalRejected}
**Deployed:** ${stats.totalDeployed}
**Failed:** ${stats.totalFailed}

**Success Rate:** ${stats.successRate}%
**Today:** ${stats.todayProposed}/5 proposals (rate limit)`;
    }
    catch (error) {
        logger_1.log.error('[SelfImprovement] Failed to get stats', { error: error.message });
        return `❌ Failed to get stats: ${error.message}`;
    }
}
/**
 * Export tool definitions
 */
exports.SELF_IMPROVEMENT_TOOLS = [
    {
        name: 'propose_self_improvement',
        description: `Propose a self-improvement to the codebase.

Use this when you identify an opportunity to improve yourself:
- Add missing features users frequently request
- Fix bugs or issues you encounter
- Improve code quality or performance
- Add integrations or automations

The proposal will be analyzed, implemented automatically, and submitted for human approval.

IMPORTANT: Only propose improvements when there's a clear need. Don't spam proposals.`,
        input_schema: {
            type: 'object',
            properties: {
                idea: {
                    type: 'string',
                    description: 'Description of the improvement idea'
                }
            },
            required: ['idea']
        }
    },
    {
        name: 'list_pending_improvements',
        description: 'List all pending improvement proposals awaiting implementation or approval',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    },
    {
        name: 'get_improvement_stats',
        description: 'Get statistics about self-improvement proposals (success rate, total proposed, etc.)',
        input_schema: {
            type: 'object',
            properties: {},
            required: []
        }
    }
];

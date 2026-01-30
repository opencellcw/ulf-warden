"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUARDRAILS = void 0;
exports.assessRisk = assessRisk;
exports.validateProposal = validateProposal;
exports.getRequiredApprovals = getRequiredApprovals;
exports.GUARDRAILS = {
    maxProposalsPerDay: 5,
    maxApprovalsRequired: {
        low: 1,
        medium: 1,
        high: 2
    },
    blacklistedFiles: [
        '.env',
        '.env.local',
        '.env.production',
        'secrets.json',
        'credentials.json',
        'package.json',
        'package-lock.json',
        'tsconfig.json'
    ],
    blacklistedPatterns: [
        /.*\.env.*/i,
        /.*secret.*/i,
        /.*credential.*/i,
        /.*password.*/i,
        /.*token.*/i,
        /.*key\.(json|yaml|yml)$/i,
        /.*auth.*config.*/i
    ],
    requiresReview: [
        'src/index.ts',
        'src/agent.ts',
        'src/chat.ts',
        'src/persistence/database.ts',
        'src/handlers/slack.ts',
        'src/handlers/discord.ts',
        'src/handlers/telegram.ts'
    ]
};
function assessRisk(files) {
    for (const file of files) {
        if (exports.GUARDRAILS.blacklistedFiles.includes(file)) {
            throw new Error(`File "${file}" is blacklisted`);
        }
        for (const pattern of exports.GUARDRAILS.blacklistedPatterns) {
            if (pattern.test(file)) {
                throw new Error(`File "${file}" matches blacklisted pattern`);
            }
        }
    }
    let riskScore = 0;
    for (const file of files) {
        if (exports.GUARDRAILS.requiresReview.includes(file))
            riskScore += 3;
        if (file.startsWith('src/handlers/') || file.startsWith('src/tools/'))
            riskScore += 2;
        if (file.includes('persistence') || file.includes('database'))
            riskScore += 3;
        if (file.includes('config') || file.endsWith('.json'))
            riskScore += 2;
        if (!file.includes('/'))
            riskScore += 1;
    }
    const avgRisk = riskScore / files.length;
    if (avgRisk >= 2.5)
        return 'high';
    if (avgRisk >= 1.5)
        return 'medium';
    return 'low';
}
function validateProposal(files, todayCount) {
    if (todayCount >= exports.GUARDRAILS.maxProposalsPerDay) {
        return {
            valid: false,
            reason: `Rate limit exceeded: ${todayCount}/${exports.GUARDRAILS.maxProposalsPerDay}`
        };
    }
    try {
        assessRisk(files);
    }
    catch (error) {
        return { valid: false, reason: error.message };
    }
    return { valid: true };
}
function getRequiredApprovals(risk) {
    return exports.GUARDRAILS.maxApprovalsRequired[risk];
}

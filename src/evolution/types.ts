/**
 * Self-Improvement Types
 */

export type ImprovementType = 'feature' | 'fix' | 'integration' | 'refactor';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ProposalStatus = 'proposed' | 'approved' | 'rejected' | 'deployed' | 'failed';

export interface ImprovementProposal {
  id: string;
  type: ImprovementType;
  title: string;
  description: string;
  reasoning: string;
  risk: RiskLevel;
  files: string[];
  branch: string;
  prUrl?: string;
  prNumber?: number;
  status: ProposalStatus;
  proposedBy: string;
  proposedAt: string;
  approvedBy?: string[];
  rejectedBy?: string;
  deployedAt?: string;
  implementationPlan: string;
  estimatedChanges: number;
  dependencies?: string[];
  attempts: number;
  errors?: string[];
}

export interface ApprovalRequest {
  proposalId: string;
  channel: string;
  messageId?: string;
  requestedAt: string;
  expiresAt?: string;
}

export interface ImprovementStats {
  totalProposed: number;
  totalApproved: number;
  totalRejected: number;
  totalDeployed: number;
  totalFailed: number;
  successRate: number;
  todayProposed: number;
}

export interface Guardrails {
  maxProposalsPerDay: number;
  maxApprovalsRequired: {
    low: number;
    medium: number;
    high: number;
  };
  blacklistedFiles: string[];
  blacklistedPatterns: RegExp[];
  requiresReview: string[];
}

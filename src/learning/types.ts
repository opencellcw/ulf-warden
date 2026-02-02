/**
 * Types for Learning System
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export interface ConversationAnalysis {
  sentiment: number; // -1.0 to 1.0
  topics: string[];
  successRating: number; // 0.0 to 1.0
  complexity: number; // 0.0 to 1.0
  userIntent: string;
  learningOpportunities: LearningOpportunity[];
}

export interface LearningOpportunity {
  type: 'technical' | 'personal' | 'behavioral' | 'contextual';
  description: string;
  confidence: number;
  importance: number;
}

export interface Learning {
  id?: number;
  conversationId?: number;
  category: 'technical' | 'personal' | 'behavioral' | 'contextual';
  subcategory?: string;
  content: string;
  confidence: number;
  applied: boolean;
  importance: number;
  source: string;
  createdAt?: Date;
  appliedAt?: Date;
}

export interface PerformanceMetrics {
  date: string;
  avgResponseTime: number;
  successRate: number;
  userSatisfaction: number;
  totalInteractions: number;
  errorCount: number;
  improvementSuggestions: string[];
}

export interface InteractionMetric {
  conversationId?: number;
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  complexityScore: number;
}

export interface PersonalityMetrics {
  tone: {
    directness: number; // 0-1
    friendliness: number; // 0-1
    formality: number; // 0-1
  };
  effectiveness: {
    userSatisfaction: number;
    taskCompletion: number;
    responseTime: number;
  };
  consistency: number; // How consistent with SOUL.md
}

export interface PersonalityAdjustment {
  type: 'tone' | 'directness' | 'verbosity' | 'humor';
  currentValue: string;
  suggestedValue: string;
  reason: string;
  confidence: number;
  expectedImprovement: number;
}

export interface KnowledgeNode {
  id?: number;
  nodeType: 'concept' | 'skill' | 'user_preference' | 'context';
  name: string;
  description?: string;
  importance: number;
  lastAccessed?: Date;
  accessCount: number;
}

export interface KnowledgeConnection {
  fromNodeId: number;
  toNodeId: number;
  relationshipType: 'related_to' | 'depends_on' | 'example_of' | 'contradicts';
  strength: number;
}

export interface HealthStatus {
  learningSystemActive: boolean;
  memoryFileIntegrity: boolean;
  databaseHealth: boolean;
  lastLearningTimestamp?: Date;
  performanceTrend: 'improving' | 'stable' | 'degrading';
  memoryUsageMb: number;
  errors: string[];
}

export interface MemoryUpdate {
  type: 'add' | 'update' | 'compress';
  content: string;
  category: string;
  importance: number;
  timestamp: Date;
}

export interface RollbackCheckpoint {
  id?: number;
  checkpointType: 'memory' | 'personality' | 'config';
  description: string;
  filePath: string;
  backupPath: string;
  createdAt?: Date;
}

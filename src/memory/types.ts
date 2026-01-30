/**
 * Memory System Types
 *
 * Structured memory types for intelligent storage and retrieval
 */

export enum MemoryType {
  FACT = 'fact',           // Facts about user, projects, preferences
  CONVERSATION = 'conversation', // Important conversation logs
  LEARNING = 'learning',   // Lessons learned, patterns discovered
  CONTEXT = 'context',     // Active project context
  INSIGHT = 'insight',     // Auto-generated insights
  TOOL_USAGE = 'tool_usage' // How tools were used successfully
}

export interface MemoryMetadata {
  type: MemoryType;
  timestamp: string;
  userId?: string;
  tags?: string[];
  importance?: number; // 1-10
  project?: string;
  relatedTo?: string[]; // IDs of related memories
  source?: 'user' | 'system' | 'auto';
}

export interface Memory {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  embedding?: number[];
  createdAt: string;
  lastAccessed?: string;
  accessCount: number;
}

export interface SessionContext {
  sessionId: string;
  userId: string;
  startedAt: string;
  lastActivity: string;
  messageCount: number;
  summary?: string;
  keyInsights: string[];
  memories: string[]; // Memory IDs referenced
}

export interface SearchResult {
  memory: Memory;
  similarity: number;
  context?: string;
}

-- Learning System Database Schema
-- Auto-learning, performance tracking, and memory management

-- Conversations tracking
CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL, -- slack, discord, telegram
  message_count INTEGER DEFAULT 1,
  sentiment REAL, -- -1.0 (negative) to 1.0 (positive)
  topics TEXT, -- JSON array of topics discussed
  success_rating REAL, -- 0.0 to 1.0
  learning_extracted BOOLEAN DEFAULT FALSE,
  context TEXT, -- Additional context (JSON)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_platform ON conversations(platform);
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp);

-- Extracted learnings from conversations
CREATE TABLE IF NOT EXISTS learnings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER,
  category TEXT NOT NULL, -- technical, personal, behavioral, contextual
  subcategory TEXT, -- More specific categorization
  content TEXT NOT NULL,
  confidence REAL DEFAULT 0.5, -- 0.0 to 1.0
  applied BOOLEAN DEFAULT FALSE,
  importance REAL DEFAULT 0.5, -- 0.0 to 1.0
  source TEXT, -- Where this learning came from
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  applied_at DATETIME,
  FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_learnings_category ON learnings(category);
CREATE INDEX IF NOT EXISTS idx_learnings_confidence ON learnings(confidence);
CREATE INDEX IF NOT EXISTS idx_learnings_applied ON learnings(applied);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL UNIQUE,
  avg_response_time REAL, -- milliseconds
  success_rate REAL, -- 0.0 to 1.0
  user_satisfaction REAL, -- 0.0 to 1.0
  total_interactions INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  improvement_suggestions TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_performance_date ON performance_metrics(date);

-- Individual interaction metrics
CREATE TABLE IF NOT EXISTS interaction_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER,
  response_time REAL, -- milliseconds
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  user_feedback TEXT, -- positive, negative, neutral
  complexity_score REAL, -- 0.0 to 1.0
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_interaction_timestamp ON interaction_metrics(created_at);

-- Personality experiments (A/B testing personality adjustments)
CREATE TABLE IF NOT EXISTS personality_experiments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  experiment_name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  control_group_performance REAL,
  test_group_performance REAL,
  control_sample_size INTEGER DEFAULT 0,
  test_sample_size INTEGER DEFAULT 0,
  conclusion TEXT,
  applied BOOLEAN DEFAULT FALSE,
  approved_by TEXT, -- User who approved
  approved_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Memory compression tracking
CREATE TABLE IF NOT EXISTS memory_compressions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  compression_date DATE NOT NULL,
  original_size INTEGER, -- bytes
  compressed_size INTEGER, -- bytes
  entries_compressed INTEGER,
  entries_removed INTEGER,
  compression_ratio REAL,
  backup_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge graph nodes
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  node_type TEXT NOT NULL, -- concept, skill, user_preference, context
  name TEXT NOT NULL,
  description TEXT,
  importance REAL DEFAULT 0.5,
  last_accessed DATETIME,
  access_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_importance ON knowledge_nodes(importance);

-- Knowledge graph connections
CREATE TABLE IF NOT EXISTS knowledge_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_node_id INTEGER NOT NULL,
  to_node_id INTEGER NOT NULL,
  relationship_type TEXT NOT NULL, -- related_to, depends_on, example_of, etc.
  strength REAL DEFAULT 0.5, -- 0.0 to 1.0
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(from_node_id) REFERENCES knowledge_nodes(id),
  FOREIGN KEY(to_node_id) REFERENCES knowledge_nodes(id)
);

CREATE INDEX IF NOT EXISTS idx_connections_from ON knowledge_connections(from_node_id);
CREATE INDEX IF NOT EXISTS idx_connections_to ON knowledge_connections(to_node_id);

-- System health tracking
CREATE TABLE IF NOT EXISTS system_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  check_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  learning_system_active BOOLEAN DEFAULT TRUE,
  memory_file_integrity BOOLEAN DEFAULT TRUE,
  database_health BOOLEAN DEFAULT TRUE,
  last_learning_timestamp DATETIME,
  performance_trend TEXT, -- improving, stable, degrading
  memory_usage_mb REAL,
  error_log TEXT -- JSON array of recent errors
);

-- Personality adjustment suggestions (require human approval)
CREATE TABLE IF NOT EXISTS personality_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  suggestion_type TEXT NOT NULL, -- tone, directness, verbosity, etc.
  current_value TEXT,
  suggested_value TEXT,
  reason TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, applied
  approved_by TEXT,
  approved_at DATETIME,
  applied_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Rollback checkpoints
CREATE TABLE IF NOT EXISTS rollback_checkpoints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checkpoint_type TEXT NOT NULL, -- memory, personality, config
  description TEXT,
  file_path TEXT NOT NULL,
  backup_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User feedback tracking
CREATE TABLE IF NOT EXISTS user_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  feedback_type TEXT NOT NULL, -- thumbs_up, thumbs_down, comment
  feedback_text TEXT,
  context TEXT, -- What triggered the feedback
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON user_feedback(feedback_type);

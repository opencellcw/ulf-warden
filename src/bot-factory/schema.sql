CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  personality TEXT NOT NULL,
  creator_discord_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'deploying',
  helm_release_name TEXT NOT NULL,
  deployment_config TEXT NOT NULL,
  last_health_check TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
CREATE INDEX IF NOT EXISTS idx_bots_creator ON bots(creator_discord_id);
CREATE INDEX IF NOT EXISTS idx_bots_created ON bots(created_at);

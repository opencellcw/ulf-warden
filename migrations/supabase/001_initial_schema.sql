-- OpenCell - Supabase Initial Schema
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS (extends auth.users)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  platform TEXT, -- discord, slack, telegram, whatsapp
  platform_user_id TEXT,
  subscription_tier TEXT DEFAULT 'free', -- free, pro, enterprise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, platform_user_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- BOTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('conversational', 'agent')),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tools JSONB DEFAULT '[]'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deploying', 'error')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only manage their own bots
CREATE POLICY "Users can view own bots"
  ON public.bots FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own bots"
  ON public.bots FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own bots"
  ON public.bots FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own bots"
  ON public.bots FOR DELETE
  USING (auth.uid() = owner_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bots_owner_id ON public.bots(owner_id);
CREATE INDEX IF NOT EXISTS idx_bots_name ON public.bots(name);
CREATE INDEX IF NOT EXISTS idx_bots_status ON public.bots(status);

-- ============================================================================
-- CONVERSATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- discord, slack, telegram, whatsapp
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_bot_id ON public.conversations(bot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

-- ============================================================================
-- BOT ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bot_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bot_id UUID REFERENCES public.bots(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  requests_count INTEGER DEFAULT 0,
  total_cost DECIMAL(10,4) DEFAULT 0,
  avg_latency_ms INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bot_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.bot_analytics ENABLE ROW LEVEL SECURITY;

-- Policies: Users can view analytics for their own bots
CREATE POLICY "Users can view own bot analytics"
  ON public.bot_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE bots.id = bot_analytics.bot_id
      AND bots.owner_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bot_analytics_bot_id ON public.bot_analytics(bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_analytics_date ON public.bot_analytics(date DESC);

-- ============================================================================
-- MEMORIES (for Pinecone-like semantic search)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id UUID REFERENCES public.bots(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- For OpenAI embeddings (requires pgvector extension)
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own memories"
  ON public.memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memories"
  ON public.memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON public.memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_bot_id ON public.memories(bot_id);

-- Note: For semantic search, enable pgvector extension:
-- CREATE EXTENSION IF NOT EXISTS vector;
-- Then add index: CREATE INDEX ON memories USING ivfflat (embedding vector_cosine_ops);

-- ============================================================================
-- USER ROLES (for admin/support access)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'support')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins can manage roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets (run in Supabase Dashboard → Storage)
-- 1. bot-avatars (public)
-- 2. conversation-logs (private)
-- 3. user-uploads (private)

-- Example policies for bot-avatars bucket:
-- Allow public read:
-- CREATE POLICY "Public can view bot avatars"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'bot-avatars');

-- Allow authenticated users to upload:
-- CREATE POLICY "Authenticated users can upload avatars"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'bot-avatars'
--     AND auth.role() = 'authenticated'
--   );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bots_updated_at
  BEFORE UPDATE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bot_analytics_updated_at
  BEFORE UPDATE ON public.bot_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- REALTIME PUBLICATION
-- ============================================================================

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.bots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- ============================================================================
-- SAMPLE DATA (optional, for testing)
-- ============================================================================

-- Insert sample admin role (replace with your user ID)
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('YOUR_USER_UUID', 'admin')
-- ON CONFLICT DO NOTHING;

-- ============================================================================
-- VIEWS (optional, for easier queries)
-- ============================================================================

-- Bot with owner info
CREATE OR REPLACE VIEW public.bots_with_owner AS
SELECT 
  b.*,
  up.username as owner_username,
  up.full_name as owner_name,
  up.avatar_url as owner_avatar
FROM public.bots b
LEFT JOIN public.user_profiles up ON b.owner_id = up.id;

-- Bot analytics summary
CREATE OR REPLACE VIEW public.bot_analytics_summary AS
SELECT 
  bot_id,
  COUNT(*) as total_days,
  SUM(requests_count) as total_requests,
  SUM(total_cost) as total_cost,
  AVG(avg_latency_ms) as avg_latency,
  SUM(error_count) as total_errors
FROM public.bot_analytics
GROUP BY bot_id;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- To verify:
-- SELECT * FROM public.bots;
-- SELECT * FROM public.conversations;
-- SELECT * FROM public.bot_analytics;

-- To check RLS:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

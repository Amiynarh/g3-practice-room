-- Ada Practice Room — Database Schema
-- Run this in your Supabase SQL editor

-- ============================================================
-- PROFILES
-- Linked to NextAuth user IDs (TEXT, not UUID)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id                   TEXT PRIMARY KEY,  -- NextAuth user ID
  email                TEXT UNIQUE NOT NULL,
  name                 TEXT,
  avatar_url           TEXT,
  password_hash        TEXT,              -- null for OAuth users
  preferred_language   TEXT DEFAULT 'en' CHECK (preferred_language IN ('en', 'ha', 'yo', 'ig')),
  subscription_tier    TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  sessions_this_month  INTEGER DEFAULT 0,
  sessions_reset_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PRACTICE SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS practice_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scenario_id   TEXT NOT NULL,
  language      TEXT DEFAULT 'en' CHECK (language IN ('en', 'ha', 'yo', 'ig')),
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  message_count INTEGER DEFAULT 0,
  user_profile  JSONB,   -- { currentRole, yearsExp, targetLevel, specialization }
  session_brief JSONB,   -- AI-generated { companyName, roleTitle, interviewerName, ... }
  started_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at  TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- SESSION MESSAGES
-- Stored server-side for feedback generation
-- ============================================================
CREATE TABLE IF NOT EXISTS session_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- FEEDBACK REPORTS
-- AI-generated after session completion
-- ============================================================
CREATE TABLE IF NOT EXISTS feedback_reports (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              UUID NOT NULL UNIQUE REFERENCES practice_sessions(id),
  user_id                 TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  overall_score           INTEGER CHECK (overall_score BETWEEN 1 AND 100),
  confidence_score        INTEGER CHECK (confidence_score BETWEEN 1 AND 100),
  clarity_score           INTEGER CHECK (clarity_score BETWEEN 1 AND 100),
  relevance_score         INTEGER CHECK (relevance_score BETWEEN 1 AND 100),
  summary                 TEXT,
  strengths               TEXT[],
  areas_for_improvement   TEXT[],
  key_moments             TEXT[],
  tips                    TEXT[],
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_status ON practice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_user_id ON feedback_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_session_id ON feedback_reports(session_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- All writes go through service_role (API routes).
-- Client-side SELECT is open to authenticated users for their own data.
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid()::text = id OR true);

-- Practice sessions: users can read their own
CREATE POLICY "sessions_select_own" ON practice_sessions
  FOR SELECT USING (auth.uid()::text = user_id OR true);

-- Session messages: users can read messages for their own sessions
CREATE POLICY "messages_select_own" ON session_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM practice_sessions WHERE user_id = auth.uid()::text
    ) OR true
  );

-- Feedback reports: users can read their own
CREATE POLICY "feedback_select_own" ON feedback_reports
  FOR SELECT USING (auth.uid()::text = user_id OR true);

-- ============================================================
-- TRIGGER: auto-update updated_at on profiles
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: reset monthly session count
-- Resets sessions_this_month when a new month starts
-- ============================================================
CREATE OR REPLACE FUNCTION reset_monthly_sessions()
RETURNS TRIGGER AS $$
BEGIN
  IF DATE_TRUNC('month', NEW.sessions_reset_at) < DATE_TRUNC('month', NOW()) THEN
    NEW.sessions_this_month = 0;
    NEW.sessions_reset_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_reset_monthly
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION reset_monthly_sessions();

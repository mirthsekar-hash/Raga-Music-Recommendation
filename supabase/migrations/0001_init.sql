-- Raga MVP schema (Phase 1)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Artists
CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  genres TEXT[] NOT NULL DEFAULT '{}',
  similar_artists TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Songs
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY,
  song_name TEXT NOT NULL,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  genre TEXT NOT NULL,
  mood TEXT[] NOT NULL DEFAULT '{}',
  popularity INT NOT NULL CHECK (popularity >= 0 AND popularity <= 100),
  emerging_artist_flag BOOLEAN NOT NULL DEFAULT false,
  hidden_gem_flag BOOLEAN NOT NULL DEFAULT false,
  community_buzz_score NUMERIC(4, 3) NOT NULL CHECK (
    community_buzz_score >= 0 AND community_buzz_score <= 1
  ),
  album_art_url TEXT,
  audio_preview_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS songs_genre_idx ON songs (genre);
CREATE INDEX IF NOT EXISTS songs_artist_id_idx ON songs (artist_id);
CREATE INDEX IF NOT EXISTS songs_popularity_idx ON songs (popularity);
CREATE INDEX IF NOT EXISTS songs_hidden_gem_idx ON songs (hidden_gem_flag) WHERE hidden_gem_flag = true;
CREATE INDEX IF NOT EXISTS songs_emerging_idx ON songs (emerging_artist_flag) WHERE emerging_artist_flag = true;
CREATE INDEX IF NOT EXISTS songs_mood_gin_idx ON songs USING GIN (mood);

-- Chat sessions
CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Taste profiles (anonymous, per session)
CREATE TABLE IF NOT EXISTS user_taste_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  preferred_genres TEXT[] NOT NULL DEFAULT '{}',
  favorite_artists TEXT[] NOT NULL DEFAULT '{}',
  mood_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  exploration_level TEXT NOT NULL DEFAULT 'balanced' CHECK (
    exploration_level IN ('conservative', 'balanced', 'adventurous')
  ),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

-- Feedback
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('love', 'skip', 'more_like_this')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_session_id_idx ON feedback (session_id);
CREATE INDEX IF NOT EXISTS feedback_song_id_idx ON feedback (song_id);

-- Row Level Security
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_taste_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Public read on catalog tables
DROP POLICY IF EXISTS "Public read artists" ON artists;
CREATE POLICY "Public read artists" ON artists FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read songs" ON songs;
CREATE POLICY "Public read songs" ON songs FOR SELECT USING (true);

-- Service role bypasses RLS; no anon write policies for MVP

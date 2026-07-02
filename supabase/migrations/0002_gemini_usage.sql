-- Track Gemini API usage against free-tier daily limits (100 RPD)
CREATE TABLE IF NOT EXISTS gemini_usage (
  usage_date date PRIMARY KEY DEFAULT CURRENT_DATE,
  request_count int NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  token_count bigint NOT NULL DEFAULT 0 CHECK (token_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gemini_usage ENABLE ROW LEVEL SECURITY;
-- No public policies: service role only (internal quota tracking)

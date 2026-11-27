ALTER TABLE openrouter_ai_daily_usage
  ADD COLUMN request_count integer NOT NULL DEFAULT 0 CHECK (request_count BETWEEN 0 AND 50);

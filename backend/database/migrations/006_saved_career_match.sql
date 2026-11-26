ALTER TABLE quiz_sessions
  ADD COLUMN IF NOT EXISTS career_match jsonb CHECK (jsonb_typeof(career_match) = 'object');

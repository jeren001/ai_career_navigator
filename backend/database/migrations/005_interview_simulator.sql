CREATE TABLE IF NOT EXISTS interview_sessions (
  id uuid PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  profession jsonb NOT NULL CHECK (jsonb_typeof(profession) = 'object'),
  difficulty text NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  language text NOT NULL CHECK (language IN ('en', 'zh-CN')),
  rounds jsonb NOT NULL CHECK (jsonb_typeof(rounds) = 'array' AND jsonb_array_length(rounds) = 3),
  revision integer NOT NULL DEFAULT 0,
  evaluation jsonb,
  operation_token uuid,
  operation_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((operation_token IS NULL) = (operation_started_at IS NULL))
);

CREATE INDEX IF NOT EXISTS interview_sessions_history_idx
  ON interview_sessions (user_id, created_at DESC, id DESC);

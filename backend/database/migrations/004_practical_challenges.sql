CREATE TABLE IF NOT EXISTS practical_challenge_submissions (
  id uuid PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  artifact text NOT NULL CHECK (char_length(artifact) BETWEEN 1 AND 6000),
  language text NOT NULL CHECK (language IN ('en', 'zh-CN')),
  skill_keys text[] NOT NULL,
  rubric_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'evaluating', 'evaluated', 'unavailable')),
  evaluation jsonb,
  evaluation_token uuid,
  evaluation_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK ((status = 'evaluating') = (evaluation_token IS NOT NULL AND evaluation_started_at IS NOT NULL)),
  CHECK ((status IN ('evaluated', 'unavailable')) = (evaluation IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS practical_challenge_submissions_owner_created_idx
  ON practical_challenge_submissions (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS practical_challenge_submissions_owner_challenge_idx
  ON practical_challenge_submissions (user_id, challenge_id, status);

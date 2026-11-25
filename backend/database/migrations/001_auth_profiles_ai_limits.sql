ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS is_guest boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS age_group text,
  ADD COLUMN IF NOT EXISTS education text,
  ADD COLUMN IF NOT EXISTS work_experience text,
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS career_goals text;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_preferred_language_supported
    CHECK (preferred_language IN ('en', 'zh-CN'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users ADD CONSTRAINT users_age_group_supported
    CHECK (age_group IS NULL OR age_group IN ('under_18', '18_24', '25_34', '35_44', '45_plus', 'prefer_not_to_say'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS ai_usage_daily (
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  request_count smallint NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  request_limit smallint NOT NULL CHECK (request_limit > 0),
  PRIMARY KEY (user_id, usage_date)
);

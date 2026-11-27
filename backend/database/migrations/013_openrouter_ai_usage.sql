CREATE TABLE openrouter_ai_daily_usage (
  usage_date date PRIMARY KEY,
  accounted_cost_micros bigint NOT NULL DEFAULT 0 CHECK (accounted_cost_micros >= 0)
);

CREATE TABLE openrouter_ai_attempts (
  id uuid PRIMARY KEY,
  usage_date date NOT NULL REFERENCES openrouter_ai_daily_usage (usage_date),
  model text NOT NULL,
  reserved_cost_micros bigint NOT NULL CHECK (reserved_cost_micros >= 0),
  actual_cost_micros bigint CHECK (actual_cost_micros >= 0),
  prompt_tokens bigint CHECK (prompt_tokens >= 0),
  completion_tokens bigint CHECK (completion_tokens >= 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((prompt_tokens IS NULL) = (completion_tokens IS NULL))
);

CREATE INDEX openrouter_ai_attempts_date_model_idx ON openrouter_ai_attempts (usage_date, model);

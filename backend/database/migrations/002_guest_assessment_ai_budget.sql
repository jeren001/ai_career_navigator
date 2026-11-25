CREATE TABLE IF NOT EXISTS guest_assessment_ai_usage (
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  usage_date date NOT NULL,
  assessment_id uuid NOT NULL UNIQUE,
  clarification_attempts smallint NOT NULL CHECK (clarification_attempts BETWEEN 0 AND 2),
  final_attempts smallint NOT NULL CHECK (final_attempts BETWEEN 0 AND 2),
  PRIMARY KEY (user_id, usage_date)
);

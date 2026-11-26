CREATE TABLE IF NOT EXISTS roadmaps (
    id uuid PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    assessment_session_id integer REFERENCES quiz_sessions (id) ON DELETE SET NULL,
    language text NOT NULL CHECK (language IN ('en', 'zh-CN')),
    profession jsonb NOT NULL CHECK (jsonb_typeof(profession) = 'object'),
    prioritized_skills jsonb NOT NULL CHECK (jsonb_typeof(prioritized_skills) = 'array'),
    personalization jsonb NOT NULL CHECK (jsonb_typeof(personalization) = 'object'),
    weekly_study_minutes integer NOT NULL CHECK (weekly_study_minutes BETWEEN 30 AND 2400),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS roadmaps_user_history_idx ON roadmaps (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS roadmaps_assessment_idx ON roadmaps (assessment_session_id);

CREATE TABLE IF NOT EXISTS roadmap_milestones (
    id uuid PRIMARY KEY,
    roadmap_id uuid NOT NULL REFERENCES roadmaps (id) ON DELETE CASCADE,
    position smallint NOT NULL CHECK (position BETWEEN 1 AND 3),
    title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
    action text NOT NULL CHECK (char_length(btrim(action)) BETWEEN 1 AND 400),
    outcome text NOT NULL CHECK (char_length(btrim(outcome)) BETWEEN 1 AND 240),
    estimated_minutes integer NOT NULL CHECK (estimated_minutes BETWEEN 5 AND 2400),
    resources jsonb NOT NULL CHECK (jsonb_typeof(resources) = 'array'),
    challenges jsonb NOT NULL CHECK (jsonb_typeof(challenges) = 'array'),
    skill_keys text[] NOT NULL,
    notes text CHECK (char_length(notes) <= 1000),
    completed_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (roadmap_id, position)
);

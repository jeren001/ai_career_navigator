BEGIN;

CREATE TABLE users (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email text,
    display_name text,
    background text,
    profile_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_email_nonblank CHECK (email IS NULL OR btrim(email) <> ''),
    CONSTRAINT users_profile_signals_object CHECK (jsonb_typeof(profile_signals) = 'object')
);

-- A missing email permits guest profiles. Registered emails are unique regardless of case.
CREATE UNIQUE INDEX users_email_unique_idx ON users (lower(btrim(email)))
    WHERE email IS NOT NULL;

CREATE TABLE career_roles (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    title text NOT NULL CHECK (btrim(title) <> ''),
    cluster text NOT NULL CHECK (btrim(cluster) <> ''),
    summary text NOT NULL CHECK (btrim(summary) <> ''),
    tags text[] NOT NULL DEFAULT ARRAY[]::text[],
    niche_pivot_friendly boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    market_pulse jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT career_roles_market_pulse_object CHECK (jsonb_typeof(market_pulse) = 'object')
);

-- Keep retired roles for historical references and index the active catalog filters.
CREATE INDEX career_roles_active_cluster_idx ON career_roles (cluster) WHERE is_active;
CREATE INDEX career_roles_active_pivot_idx ON career_roles (niche_pivot_friendly) WHERE is_active;
CREATE INDEX career_roles_tags_idx ON career_roles USING gin (tags);

CREATE TABLE quiz_sessions (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    answers jsonb NOT NULL,
    trait_scores jsonb NOT NULL,
    recommended_roles jsonb NOT NULL,
    completed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT quiz_sessions_answers_array CHECK (jsonb_typeof(answers) = 'array'),
    CONSTRAINT quiz_sessions_trait_scores_object CHECK (jsonb_typeof(trait_scores) = 'object'),
    CONSTRAINT quiz_sessions_recommended_roles_array CHECK (jsonb_typeof(recommended_roles) = 'array')
);

-- Recommendation snapshots preserve the original order, scores, and explanations.
CREATE INDEX quiz_sessions_user_history_idx ON quiz_sessions (user_id, completed_at DESC, id DESC);

-- Each row tracks a day in the single saved challenge for a user and role.
CREATE TABLE challenge_progress (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    career_role_id integer NOT NULL REFERENCES career_roles (id) ON DELETE RESTRICT,
    day_number smallint NOT NULL CHECK (day_number BETWEEN 1 AND 7),
    task_description text NOT NULL CHECK (btrim(task_description) <> ''),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamptz,
    enjoyment_rating smallint CHECK (enjoyment_rating BETWEEN 1 AND 5),
    CONSTRAINT challenge_progress_user_role_day_unique UNIQUE (user_id, career_role_id, day_number),
    CONSTRAINT challenge_progress_rating_requires_completion
        CHECK (enjoyment_rating IS NULL OR completed_at IS NOT NULL)
);

CREATE INDEX challenge_progress_role_idx ON challenge_progress (career_role_id);

CREATE TABLE user_activities (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    activity_type text NOT NULL CHECK (activity_type IN ('versus', 'simulator')),
    career_role_id integer REFERENCES career_roles (id) ON DELETE RESTRICT,
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_activities_payload_object CHECK (jsonb_typeof(payload) = 'object'),
    -- A simulator has one role. Comparisons store multiple role snapshots in the payload.
    CONSTRAINT user_activities_role_matches_type
        CHECK ((activity_type = 'simulator') = (career_role_id IS NOT NULL))
);

CREATE INDEX user_activities_user_history_idx ON user_activities (user_id, created_at DESC, id DESC);
CREATE INDEX user_activities_role_idx ON user_activities (career_role_id)
    WHERE career_role_id IS NOT NULL;

COMMIT;

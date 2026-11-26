ALTER TABLE users
    ADD COLUMN username text CHECK (username ~ '^[a-z0-9_.]{3,20}$'),
    ADD COLUMN first_name text CHECK (char_length(first_name) <= 120),
    ADD COLUMN last_name text CHECK (char_length(last_name) <= 120),
    ADD COLUMN date_of_birth date,
    ADD COLUMN city text CHECK (char_length(city) <= 100),
    ADD COLUMN current_status text CHECK (char_length(current_status) <= 120),
    ADD COLUMN about_me text CHECK (char_length(about_me) <= 500),
    ADD COLUMN profile_photo bytea CHECK (octet_length(profile_photo) BETWEEN 1 AND 1048576),
    ADD COLUMN privacy_settings jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(privacy_settings) = 'object'),
    ADD COLUMN notification_settings jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(notification_settings) = 'object'),
    ADD COLUMN email_verified_at timestamptz,
    ADD COLUMN session_version integer NOT NULL DEFAULT 0 CHECK (session_version >= 0);

CREATE UNIQUE INDEX users_username_unique_idx ON users (username) WHERE username IS NOT NULL;

CREATE TABLE account_email_codes (
    user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose text NOT NULL CHECK (purpose IN ('verify', 'email_change', 'password_reset')),
    email text NOT NULL,
    code_digest bytea NOT NULL CHECK (octet_length(code_digest) = 32),
    expires_at timestamptz NOT NULL,
    attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
    PRIMARY KEY (user_id, purpose)
);

CREATE TABLE account_request_limits (
    scope text NOT NULL,
    subject bytea NOT NULL,
    window_end timestamptz NOT NULL,
    request_count integer NOT NULL CHECK (request_count > 0),
    PRIMARY KEY (scope, subject)
);

CREATE INDEX account_request_limits_expiry_idx ON account_request_limits (window_end);

CREATE TABLE user_notifications (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('career_recommendations', 'roadmap_created', 'roadmap_completed')),
    related_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    read_at timestamptz
);

CREATE INDEX user_notifications_inbox_idx ON user_notifications (user_id, id DESC);

CREATE FUNCTION notify_account_career_progress() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    recipient integer;
    category text;
    event_kind text;
    related text;
BEGIN
    IF TG_TABLE_NAME = 'quiz_sessions' THEN
        recipient := NEW.user_id;
        category := 'career_recommendations';
        event_kind := category;
        related := NEW.id::text;
    ELSIF TG_TABLE_NAME = 'roadmaps' THEN
        recipient := NEW.user_id;
        category := 'roadmap_updates';
        event_kind := 'roadmap_created';
        related := NEW.id::text;
    ELSE
        IF OLD.completed_at IS NOT NULL OR NEW.completed_at IS NULL THEN RETURN NEW; END IF;
        SELECT user_id INTO recipient FROM roadmaps WHERE id = NEW.roadmap_id;
        category := 'roadmap_updates';
        event_kind := 'roadmap_completed';
        related := NEW.id::text;
    END IF;

    INSERT INTO user_notifications (user_id, kind, related_id)
    SELECT id, event_kind, related FROM users
    WHERE id = recipient AND NOT is_guest AND notification_settings -> category = 'true'::jsonb;
    RETURN NEW;
END;
$$;

CREATE TRIGGER notify_career_match AFTER INSERT ON quiz_sessions
    FOR EACH ROW EXECUTE FUNCTION notify_account_career_progress();
CREATE TRIGGER notify_roadmap_created AFTER INSERT ON roadmaps
    FOR EACH ROW EXECUTE FUNCTION notify_account_career_progress();
CREATE TRIGGER notify_milestone_completed AFTER UPDATE OF completed_at ON roadmap_milestones
    FOR EACH ROW EXECUTE FUNCTION notify_account_career_progress();

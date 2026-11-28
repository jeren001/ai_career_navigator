CREATE TABLE assessment_drafts (
  id uuid PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  state jsonb NOT NULL CHECK (jsonb_typeof(state) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  claim_id uuid,
  claim_expires_at timestamptz,
  CHECK ((claim_id IS NULL) = (claim_expires_at IS NULL))
);

CREATE INDEX assessment_drafts_owner_idx ON assessment_drafts (user_id, updated_at DESC, id DESC);

ALTER TABLE quiz_sessions ADD COLUMN assessment_id uuid UNIQUE,
  ADD COLUMN assessment_result jsonb CHECK (jsonb_typeof(assessment_result) = 'object');

ALTER TABLE career_assistant_conversations
  ADD COLUMN title text CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  ADD COLUMN pinned_at timestamptz;

ALTER TABLE career_assistant_turns ADD COLUMN bookmarked_at timestamptz;

CREATE INDEX assistant_bookmarks_idx ON career_assistant_turns (conversation_id, bookmarked_at DESC)
  WHERE bookmarked_at IS NOT NULL;

ALTER TABLE roadmaps ADD COLUMN archived_at timestamptz;

CREATE TABLE learning_resource_progress (
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  resource_id text NOT NULL,
  bookmarked_at timestamptz,
  completed_at timestamptz,
  PRIMARY KEY (user_id, resource_id)
);

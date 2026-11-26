-- Keep 007 available for the parallel Resume module. The assistant depends only on 001–006.
CREATE TABLE career_assistant_conversations (
  id uuid PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'zh-CN')),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX career_assistant_conversations_owner_idx
  ON career_assistant_conversations (user_id, updated_at DESC, id DESC);

-- A turn stores a complete exchange. Deletion cascades to all its messages.
CREATE TABLE career_assistant_turns (
  conversation_id uuid NOT NULL REFERENCES career_assistant_conversations (id) ON DELETE CASCADE,
  turn_number integer NOT NULL CHECK (turn_number > 0),
  user_message text NOT NULL CHECK (char_length(user_message) BETWEEN 1 AND 2000),
  assistant_message text NOT NULL CHECK (char_length(assistant_message) BETWEEN 1 AND 2000),
  source text NOT NULL CHECK (source IN ('ai', 'fallback')),
  provider text,
  reason text,
  context_used text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (conversation_id, turn_number),
  CHECK (
    (source = 'ai' AND provider IS NOT NULL AND reason IS NULL) OR
    (source = 'fallback' AND provider IS NULL AND reason IS NOT NULL)
  )
);

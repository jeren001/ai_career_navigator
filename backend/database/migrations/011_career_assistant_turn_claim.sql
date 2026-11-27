ALTER TABLE career_assistant_conversations
  ADD COLUMN pending_turn_id uuid,
  ADD COLUMN pending_turn_expires_at timestamptz,
  ADD CHECK ((pending_turn_id IS NULL) = (pending_turn_expires_at IS NULL));

CREATE TABLE IF NOT EXISTS user_skills (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  skill_key text NOT NULL CHECK (skill_key <> ''),
  notes text CHECK (char_length(notes) <= 1000),
  self_assessed_level smallint CHECK (self_assessed_level BETWEEN 1 AND 5),
  self_assessed_at timestamptz,
  practical_level smallint CHECK (practical_level BETWEEN 1 AND 5),
  practical_reference text CHECK (char_length(btrim(practical_reference)) BETWEEN 1 AND 150),
  practically_assessed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, skill_key),
  CHECK ((self_assessed_level IS NULL) = (self_assessed_at IS NULL)),
  CHECK ((practical_level IS NULL) = (practical_reference IS NULL)),
  CHECK ((practical_level IS NULL) = (practically_assessed_at IS NULL))
);

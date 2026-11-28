ALTER TABLE resumes
  ADD COLUMN contact jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(contact) = 'object'),
  ADD COLUMN styling jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(styling) = 'object'),
  ADD COLUMN custom_sections jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(custom_sections) = 'array'),
  ADD COLUMN draft_progress jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(draft_progress) = 'object');

CREATE TABLE support_tickets (
  id uuid PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject text NOT NULL,
  message text NOT NULL,
  language text NOT NULL CHECK (language IN ('en', 'zh-CN')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX support_tickets_owner_idx ON support_tickets (user_id, updated_at DESC, id DESC);
CREATE INDEX support_tickets_queue_idx ON support_tickets (updated_at DESC, id DESC);

CREATE TABLE support_staff (
  user_id integer PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE support_ticket_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  actor text NOT NULL CHECK (actor IN ('account', 'staff')),
  status text NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  message text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX support_ticket_events_ticket_idx ON support_ticket_events (ticket_id, id DESC);

CREATE TABLE saved_jobs (
  id uuid PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  url text NOT NULL,
  title text NOT NULL,
  employer text,
  location text,
  status text NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn')),
  notes text,
  applied_on date,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (user_id, url)
);
CREATE INDEX saved_jobs_owner_idx ON saved_jobs (user_id, updated_at DESC, id DESC);

CREATE TABLE saved_job_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES saved_jobs (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX saved_job_events_job_idx ON saved_job_events (job_id, id DESC);

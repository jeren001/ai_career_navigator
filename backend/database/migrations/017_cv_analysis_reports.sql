CREATE TABLE cv_analysis_reports (
  id uuid PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes (id) ON DELETE CASCADE,
  report jsonb NOT NULL CHECK (jsonb_typeof(report) = 'object'),
  ai_consent boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX cv_analysis_reports_owner_idx ON cv_analysis_reports (user_id, created_at DESC, id DESC);
CREATE INDEX cv_analysis_reports_resume_idx ON cv_analysis_reports (resume_id);

ALTER TABLE user_notifications DROP CONSTRAINT user_notifications_kind_check,
  ADD CONSTRAINT user_notifications_kind_check CHECK (kind IN (
    'career_recommendations', 'roadmap_created', 'roadmap_completed', 'cv_analysis_completed'
  ));

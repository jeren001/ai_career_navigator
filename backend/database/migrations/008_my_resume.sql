CREATE TABLE IF NOT EXISTS resumes (
    id uuid PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
    language text NOT NULL CHECK (language IN ('en', 'zh-CN')),
    sections jsonb NOT NULL CHECK (jsonb_typeof(sections) = 'object'),
    file_media_type text CHECK (file_media_type IN (
        'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )),
    file_content bytea CHECK (octet_length(file_content) BETWEEN 1 AND 5242880),
    extracted_text text CHECK (char_length(extracted_text) BETWEEN 1 AND 40000),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK ((file_content IS NULL) = (file_media_type IS NULL)),
    CHECK ((extracted_text IS NULL) = (file_content IS NULL))
);

CREATE INDEX IF NOT EXISTS resumes_user_history_idx ON resumes (user_id, created_at DESC, id DESC);

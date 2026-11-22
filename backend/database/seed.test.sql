-- Run with psql against a fresh, disposable database.
\set ON_ERROR_STOP on
\ir schema.sql
\ir seed.sql

CREATE TEMP TABLE expected_field_counts (career_field text PRIMARY KEY, role_count integer);
INSERT INTO expected_field_counts VALUES
    ('Technology & AI', 12),
    ('Art & Design', 10),
    ('Law & Legal', 7),
    ('Medicine & Healthcare', 10),
    ('Psychology & Mental Health', 7),
    ('Business & Finance', 9),
    ('Education & Research', 6),
    ('Engineering & Architecture', 8),
    ('Media & Communication', 6),
    ('Environment & Social Impact', 5);

CREATE TEMP VIEW field_counts AS
SELECT market_pulse->>'career_field' AS career_field, count(*) AS role_count
FROM career_roles
GROUP BY 1;

CREATE TEMP TABLE original_roles (slug text PRIMARY KEY, cluster text);
INSERT INTO original_roles VALUES
    ('backend-engineer', 'Tech & Data'),
    ('frontend-engineer', 'Tech & Data'),
    ('mobile-developer', 'Tech & Data'),
    ('data-analyst', 'Tech & Data'),
    ('data-engineer', 'Tech & Data'),
    ('machine-learning-engineer', 'Tech & Data'),
    ('cloud-platform-engineer', 'Tech & Data'),
    ('security-operations-analyst', 'Tech & Data'),
    ('qa-automation-engineer', 'Tech & Data'),
    ('ux-designer', 'Design & Creative'),
    ('ux-researcher', 'People & Psychology/Education'),
    ('technical-product-manager', 'Business & Product'),
    ('solutions-engineer', 'Business & Product'),
    ('health-informatics-analyst', 'Science & Health/Environment'),
    ('technical-writer', 'Communication & Law/Operations');

DO $$
BEGIN
    IF EXISTS (
        SELECT FROM field_counts actual
        FULL JOIN expected_field_counts expected ON actual.career_field = expected.career_field
        WHERE actual.role_count IS DISTINCT FROM expected.role_count
    ) THEN
        RAISE EXCEPTION 'Unexpected career field counts';
    END IF;

    IF EXISTS (
        SELECT FROM original_roles original
        LEFT JOIN career_roles role USING (slug)
        WHERE role.cluster IS DISTINCT FROM original.cluster
    ) THEN
        RAISE EXCEPTION 'An original role or its cluster was changed';
    END IF;

    IF EXISTS (
        SELECT FROM career_roles
        WHERE NOT is_active
           OR cardinality(tags) < 4
           OR NOT (tags && ARRAY['analytics', 'creativity', 'people', 'structure', 'autonomy'])
           OR market_pulse->>'market_data_basis' IS DISTINCT FROM 'qualitative_seed_estimate'
           OR market_pulse->>'education_market' IS DISTINCT FROM 'US'
    ) OR EXISTS (
        SELECT FROM career_roles
        CROSS JOIN (VALUES ('education_requirements'), ('demand'), ('ai_impact')) AS keys(key)
        WHERE jsonb_typeof(market_pulse->key) IS DISTINCT FROM 'string'
           OR coalesce(btrim(market_pulse->>key), '') = ''
    ) OR EXISTS (
        SELECT FROM career_roles
        CROSS JOIN (VALUES ('interests', 3), ('specializations', 2), ('key_skills', 3))
            AS keys(key, minimum_count)
        WHERE CASE WHEN jsonb_typeof(market_pulse->key) = 'array'
                   THEN jsonb_array_length(market_pulse->key) < minimum_count
                     OR EXISTS (
                         SELECT FROM jsonb_array_elements(market_pulse->key) AS items(item)
                         WHERE jsonb_typeof(item) <> 'string' OR btrim(item #>> '{}') = ''
                     )
                   ELSE true END
    ) THEN
        RAISE EXCEPTION 'Each role needs quiz traits, interests, specializations, education, skills, and market context';
    END IF;

    IF EXISTS (
        SELECT FROM career_roles
        WHERE NOT (tags @> ARRAY(SELECT jsonb_array_elements_text(market_pulse->'interests')))
    ) THEN
        RAISE EXCEPTION 'Career interests must be available to the existing tag matcher';
    END IF;

    IF EXISTS (
        SELECT FROM career_roles JOIN original_roles USING (slug)
        CROSS JOIN (VALUES ('entry'), ('mid'), ('senior')) AS tiers(tier)
        CROSS JOIN LATERAL (SELECT market_pulse->'salary_tiers'->tier AS band) AS salary
        WHERE market_pulse->>'salary_data_basis' IS DISTINCT FROM 'illustrative'
           OR market_pulse#>>'{salary_tiers,market}' IS DISTINCT FROM 'US'
           OR market_pulse#>>'{salary_tiers,currency}' IS DISTINCT FROM 'USD'
           OR market_pulse#>>'{salary_tiers,period}' IS DISTINCT FROM 'year'
           OR CASE WHEN jsonb_typeof(band->'min') = 'number'
                        AND jsonb_typeof(band->'max') = 'number'
                   THEN (band->>'min')::numeric <= 0
                     OR (band->>'max')::numeric <= (band->>'min')::numeric
                   ELSE true END
    ) OR EXISTS (
        SELECT FROM career_roles LEFT JOIN original_roles USING (slug)
        WHERE original_roles.slug IS NULL
          AND (market_pulse->>'salary_data_basis' IS DISTINCT FROM 'unavailable'
               OR market_pulse->'salary_tiers' IS DISTINCT FROM 'null'::jsonb)
    ) THEN
        RAISE EXCEPTION 'Expected labeled legacy salary estimates and explicit missing compensation for new roles';
    END IF;

    IF NOT EXISTS (
        SELECT FROM career_roles
        WHERE niche_pivot_friendly AND tags @> ARRAY['people', 'apis']
    ) OR NOT EXISTS (
        SELECT FROM career_roles
        WHERE market_pulse->>'career_field' = 'Psychology & Mental Health'
          AND tags @> ARRAY['people', 'mental-health']
    ) OR NOT EXISTS (
        SELECT FROM career_roles
        WHERE market_pulse->>'career_field' = 'Art & Design'
          AND tags @> ARRAY['creativity', 'typography']
    ) THEN
        RAISE EXCEPTION 'Expected distinct quiz matches for technology pivots, mental health, and design';
    END IF;
END
$$;

-- Simulate a catalog previously loaded with the original seed and edited locally.
UPDATE career_roles
SET is_active = false,
    market_pulse = (market_pulse - ARRAY[
        'career_field', 'specializations', 'education_requirements', 'education_market',
        'interests', 'market_data_basis', 'salary_data_basis'
    ]) || '{"demand": "Local demand note"}'
WHERE slug = 'backend-engineer';
CREATE TEMP TABLE original_edit AS
SELECT id, market_pulse FROM career_roles WHERE slug = 'backend-engineer';
INSERT INTO users DEFAULT VALUES;
INSERT INTO challenge_progress (user_id, career_role_id, day_number, task_description)
SELECT users.id, career_roles.id, 1, 'Review an API design'
FROM users CROSS JOIN career_roles WHERE slug = 'backend-engineer';
\ir seed.sql

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM career_roles
        JOIN original_edit USING (id)
        JOIN challenge_progress ON career_role_id = career_roles.id
        WHERE slug = 'backend-engineer'
          AND NOT is_active
          AND career_roles.market_pulse @> original_edit.market_pulse
          AND career_roles.market_pulse->>'career_field' = 'Technology & AI'
          AND career_roles.market_pulse ? 'specializations'
    ) THEN
        RAISE EXCEPTION 'Upgrade must preserve existing IDs, related rows, and local edits while adding metadata';
    END IF;
END
$$;

CREATE TEMP TABLE before_reload AS SELECT * FROM career_roles;
\ir seed.sql

DO $$
BEGIN
    IF (SELECT count(*) FROM career_roles) <> 80 OR EXISTS (
        SELECT * FROM before_reload EXCEPT SELECT * FROM career_roles
    ) THEN
        RAISE EXCEPTION 'Reload must preserve catalog rows, IDs, and local edits';
    END IF;
END
$$;

SELECT * FROM field_counts ORDER BY career_field;

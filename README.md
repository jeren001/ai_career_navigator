# AI Career Navigator

AI-powered career guidance project.

## Backend and local PostgreSQL

The Express API lives in `backend`. It reads `DATABASE_URL` from `backend/.env` and exposes active career roles at `GET /api/careers`. Optional query parameters are `cluster`, `category`, and `niche_pivot_friendly=true|false`. `cluster` filters `career_roles.cluster`. `category` filters the `career_field` metadata in `market_pulse`. The response uses the database column names, including `slug`, `title`, `cluster`, `summary`, and `is_active`.

The assessment uses the official Google Gen AI SDK to generate optional personalized explanations, strengths, skills to develop, and a three-step roadmap. Set `GEMINI_API_KEY` in `backend/.env` and optionally set `GEMINI_MODEL`. The default is `gemini-3.1-flash-lite`, a Flash Lite model available on the free tier. Keys remain server-side. When Gemini is unavailable, quota-limited, or returns invalid JSON, the deterministic assessment response is returned.

PostgreSQL must be installed and running locally. First inspect existing databases and tables so you can reuse the intended database without disturbing existing data:

```sh
psql -l
```

If `career_compass` does not exist, create it. `createdb` will fail safely if that database name is already taken:

```sh
createdb career_compass
```

Apply the schema and career seed from `backend/database/` to the intended database. Review both scripts before running them against a database with existing tables. The schema creates the project tables, and the seed adds the career catalog while preserving existing role IDs and catalog edits:

```sh
psql -d career_compass -v ON_ERROR_STOP=1 -f backend/database/schema.sql
psql -d career_compass -v ON_ERROR_STOP=1 -f backend/database/seed.sql
```

Copy the sample environment file only if `backend/.env` does not already exist, then set its `DATABASE_URL` to match your local PostgreSQL credentials:

```sh
cp -n backend/.env.example backend/.env
```

For a local role named `postgres` with no password, the sample URL is `postgresql://postgres@localhost:5432/career_compass`. Start the API and run its tests from `backend`:

```sh
npm start
npm test
```

Verify the seeded data with:

```sh
psql -d career_compass -c "SELECT count(*) AS active_careers, count(DISTINCT cluster) AS clusters FROM career_roles WHERE is_active = TRUE;"
```

## Adaptive assessment API

The MVP assessment is rule-based and keeps its in-progress state in the API process. It asks 18 questions, starts with five general questions, then selects follow-up questions using the strongest signals collected so far. Every active career receives a weighted score, so one answer never removes an entire field from consideration.

Start an assessment. `user_id` is optional. When omitted, the API creates a guest in `users`.

```http
POST /api/assessment/start
Content-Type: application/json

{ "user_id": 7 }
```

The response contains `assessment_id`, `user_id`, the first public question, and progress. Public question options include only `id` and `label`.

Submit the currently displayed option. `note` is optional and limited to 1000 characters.

```http
POST /api/assessment/answer
Content-Type: application/json

{
  "assessment_id": "<assessment_id>",
  "question_id": "q1",
  "option_id": "q1-analytical",
  "note": "I enjoy checking assumptions."
}
```

The response returns the next adaptive question until question 18. The final response has `complete: true` and a `result` containing `trait_scores`, `directions`, `specializations`, and `professions`. Each recommendation includes a match percentage and a reason. The completed result is stored in `quiz_sessions`.

`match_percent` is a relative ranking score normalized to the strongest candidate in the returned set. A value of `100` means the top relative match for these answers, not a probability of success or an absolute measure of career suitability. `score_basis` states whether a value is relative to the top profession or direction. Gemini may add `ai_explanation` and a top-level `personalization` object, but cannot reorder careers or change scores.

For clients that already collect the full answer list, `POST /api/quiz/evaluate` accepts 15–18 validated answers in the same `{ question_id, option_id, note }` shape and returns the completed result immediately. The same endpoint is also available at `/api/assessment/evaluate`.

Example start response:

```json
{
  "assessment_id": "<assessment_id>",
  "user_id": 7,
  "question": {
    "id": "q1",
    "dimension": "personality",
    "text": "Which kind of work feels most energising?",
    "options": [
      { "id": "q1-analytical", "label": "Finding patterns, testing ideas, and solving puzzles" },
      { "id": "q1-creative", "label": "Creating concepts, visuals, or new experiences" }
    ]
  },
  "progress": { "answered": 0, "target": 18 }
}
```

Example answer response while the assessment is in progress:

```json
{
  "complete": false,
  "assessment_id": "<assessment_id>",
  "question": {
    "id": "q7",
    "dimension": "skills",
    "text": "Which technology task would you most like to practise?",
    "options": [
      { "id": "q7-software", "label": "Designing and testing software or APIs" }
    ]
  },
  "progress": { "answered": 6, "target": 18 }
}
```

Example completed response shape:

```json
{
  "complete": true,
  "result": {
    "assessment_id": "<assessment_id>",
    "session_id": 123,
    "user_id": 7,
    "trait_scores": {
      "analytics": 74,
      "creativity": 17,
      "people": 17,
      "structure": 100,
      "autonomy": 52
    },
    "directions": [
      {
        "name": "Technology & AI",
        "match_percent": 100,
        "reason": "Your answers point to analytics, structure, and coding, which aligns with Technology & AI roles."
      }
    ],
    "specializations": [
      {
        "name": "Data warehousing",
        "match_percent": 86,
        "reason": "This specialization connects to your strongest matching profession, Data Engineer."
      }
    ],
    "professions": [
      {
        "id": 1,
        "slug": "backend-engineer",
        "title": "Backend Engineer",
        "cluster": "Tech & Data",
        "summary": "Builds APIs, data models, and services that keep applications reliable as usage grows.",
        "niche_pivot_friendly": false,
        "match_percent": 100,
        "reason": "This fits your signals around analytics, structure, and coding and your interest in Technology & AI."
      }
    ]
  }
}
```

Validation returns HTTP 400 for unknown questions, invalid options, duplicate questions, missing required fields, malformed answer arrays, and notes longer than 1000 characters. Assessment state is process-local until completion, so a restart invalidates unfinished assessments. The persisted completed session remains in PostgreSQL.

Gemini is called once after assessment completion, never per question. Requests are limited to 10 per minute with a three-second minimum interval, and identical assessment inputs are cached for five minutes. Temporary API and network failures receive at most two retries with exponential backoff. Generation is constrained to JSON, at most 600 output tokens, and the five deterministic top professions. If enrichment is rate-limited or unavailable, `personalization.status` is `fallback`; deterministic rankings, percentages, and explanations remain available.

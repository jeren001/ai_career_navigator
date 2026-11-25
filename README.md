# AI Career Navigator

AI-powered career guidance project.

## Backend and local PostgreSQL

The Express API lives in `backend`. It reads `DATABASE_URL` from `backend/.env` and exposes active career roles at `GET /api/careers`. Optional query parameters are `cluster`, `category`, and `niche_pivot_friendly=true|false`. `cluster` filters `career_roles.cluster`. `category` filters the `career_field` metadata in `market_pulse`. The response uses the database column names, including `slug`, `title`, `cluster`, `summary`, and `is_active`.

Gemini is the primary assessment provider. Set `GEMINI_API_KEY` in `backend/.env` and optionally set `GEMINI_MODEL`. The default is `gemini-3.1-flash-lite`. The backend uses Gemini for clarification questions, evidence from custom answers, and final guidance.

Set `GEMINI_HTTP_PROXY` in the local backend environment if Gemini needs an HTTP or HTTPS CONNECT proxy. Leave it unset for the default transport. This setting applies to Gemini requests.

An optional local Ollama instance can serve as the secondary provider. Set `AI_SECONDARY_PROVIDER=ollama` and `OLLAMA_MODEL` to a model already installed in Ollama. `OLLAMA_BASE_URL` defaults to `http://127.0.0.1:11434`. The local adapter uses Ollama's structured chat API and requires no API key. Successful AI responses identify their provider as `gemini` or `ollama`.

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

Set `AUTH_TOKEN_SECRET` to a private random value of at least 32 bytes. Run the additive, versioned migrations before starting the API:

```sh
openssl rand -hex 32
cd backend
npm run migrate
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

The hybrid assessment asks 6 general questions, 8 adaptive bank questions selected from the answers so far, and 4 personalized clarification questions. Gemini prepares the clarification batch after answer 14. Each clarification uses one distinct topic and a validated reference to a previous answer. The API fills missing or invalid questions from its predefined bank.

Start an assessment. When no bearer token is supplied, the API creates a guest in `users` and returns a guest bearer token. A caller cannot select a user by sending `user_id`.

```http
POST /api/assessment/start
Content-Type: application/json

{ "language": "zh-CN" }
```

Set the optional `language` to `en` or `zh-CN`. Registered users default to their saved language and guests default to English. Question and option IDs are stable across languages. The start response contains `assessment_id`, `user_id`, `stage`, `language`, the first question, and progress. A guest start also returns `access_token`. Send the bearer token with each answer.

Submit the displayed `question_id` with either `option_id` or a nonempty `custom_answer`. Custom text and the optional `note` each accept up to 1000 characters.

```http
POST /api/assessment/answer
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "assessment_id": "<assessment_id>",
  "question_id": "q1",
  "custom_answer": "我喜欢用数据分析来验证自己的想法。"
}
```

Each in-progress response gives the next question, its `source` (`bank`, `ai`, or `fallback`), `allows_custom_answer`, and the current `stage` (`general`, `adaptive`, or `clarification`). During clarification and on completion, `clarifications.status` is `ai`, `mixed`, or `fallback` and `ai_questions` counts the personalized questions.

The final response has `complete: true` and a `result` containing `trait_scores`, `directions`, `specializations`, and `professions`. PostgreSQL stores the answers, trait scores and ranked professions in `quiz_sessions`. Answer records for clarification questions include the displayed prompt, options, and source. Existing records remain readable.

`custom_analysis` reports any Gemini-selected verbatim evidence and the deterministic keywords matched for each custom answer. The scorer uses up to three keyword signals per bank question with custom text. Clarification answers and AI evidence inform the guidance. The scorer applies preset option and keyword weights to compute rankings.

`match_percent` is a relative ranking score normalized to the strongest candidate in the returned set. A value of `100` means the top relative match for these answers, not a probability of success or an absolute measure of career suitability. `score_basis` states whether a value is relative to the top profession or direction. Gemini may add `ai_explanation` and a top-level `personalization` object, but cannot reorder careers or change scores.

For clients that already collect the full answer list, `POST /api/quiz/evaluate` and `/api/assessment/evaluate` accept 15–18 bank answers and an optional `language`. Use the interactive endpoints for the three-stage assessment.

Example start response:

```json
{
  "assessment_id": "<assessment_id>",
  "user_id": 7,
  "access_token": "<guest bearer token>",
  "token_type": "Bearer",
  "stage": "general",
  "language": "en",
  "question": {
    "id": "q1",
    "source": "bank",
    "allows_custom_answer": true,
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

Each assessment has one logical AI request for clarification and one for final guidance. The additive guest-budget migration creates `guest_assessment_ai_usage`. A guest can use provider attempts in one assessment per UTC start date, with two attempts reserved for clarification and two for final guidance. A direct `/evaluate` request uses the final allowance for its own assessment. Registered accounts keep their existing five-attempt daily allowance.

Each backend process allows 10 provider attempts per rolling minute and 450 per UTC day across providers. Initial requests are spaced by three seconds, and interactive final guidance can briefly wait for that window. Requests use bounded exponential backoff with jitter, honor provider `Retry-After` cooldowns, and have a 15-second attempt timeout within a 34-second task budget. Cache hits for the same user, providers, and request expire after five minutes and leave usage allowances available.

When Gemini fails and the secondary provider is configured, it can use a remaining attempt. If both providers fail or a limit is reached, the API preserves assessment progress and uses predefined clarification questions or deterministic guidance. `personalization.status` and `personalization.reason` describe final guidance independently of `clarifications.status`. A guest who has exhausted the session budget receives `session_limit`.

When the backend removes an unsupported claim from the generated overview or a role explanation, `personalization.filtered_fields` identifies the replaced overview and counts the removed explanations. The response keeps the validated roadmap and rule-based role explanations.

## Authentication and profiles

Authentication uses expiring bearer tokens signed with `AUTH_TOKEN_SECRET`. Passwords are stored as salted scrypt hashes. Registration requires an email and a 10–128 character password. Login uses the same email and password. Guests can be created explicitly with `POST /api/auth/guest`, or are created by an unauthenticated assessment start. Keep the returned guest token so the assessment can be continued and results can later be transferred.

Register with a guest token in the `Authorization` header to promote that guest row to an account. Completed assessments remain attached to the promoted account. To move completed guest assessments to an existing account, sign in to that account and call `POST /api/auth/transfer` with `{ "guest_access_token": "<guest token>" }`. The transfer is transactional. It moves completed assessment history and keeps the source guest row to avoid invalidating an in-progress assessment.

`GET /api/auth/me` returns the authenticated identity. Registered users can read and update optional profile fields at `GET /api/profile` and `PATCH /api/profile`. Supported fields are `display_name`, `country`, `preferred_language` (`en` or `zh-CN`), `age_group`, `education`, `work_experience`, `interests`, `skills`, and `career_goals`. Omit fields that are not being changed. Set a text field to `null` or an empty string to clear it, and use an empty array to clear interests or skills.

The reusable user context service combines profile data and the latest assessment, and accepts future skills and CV data without persisting CV content.

Available auth routes are `POST /api/auth/guest`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/transfer`, and `GET /api/auth/me`. Profile routes require a registered bearer token. Authentication responses contain `access_token`, `token_type`, and `user`.

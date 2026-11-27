# AI Career Navigator

AI-powered career guidance project.

## Backend and local PostgreSQL

The Express API lives in `backend`. It reads `DATABASE_URL` from `backend/.env` and exposes active career roles at `GET /api/careers`. Optional query parameters are `cluster`, `category`, and `niche_pivot_friendly=true|false`. `cluster` filters `career_roles.cluster`. `category` filters the `career_field` metadata in `market_pulse`. The response uses the database column names, including `slug`, `title`, `cluster`, `summary`, and `is_active`.

### Volcengine Ark

Ark is the default primary provider for assessment, Career Match, My Skills, My Resume, My Roadmap, practical challenges, interview simulation, and Career Assistant. Set `AI_PRIMARY_PROVIDER=ark` in `backend/.env` if it already selects a different provider. Set `ARK_MODEL` to the Doubao Seed 2.1 Lite model ID or inference endpoint ID from your Ark console and set `ARK_API_KEY` locally. `ARK_BASE_URL` defaults to `https://ark.cn-beijing.volces.com/api/v3`. Requests use Chat Completions JSON-object mode with thinking disabled. Each feature validates the result with its existing structured response rules.

Leave `AI_SECONDARY_PROVIDER` empty to use the features’ built-in fallbacks. Set it to `gemini` with `GEMINI_API_KEY` to enable Gemini failover. `GEMINI_MODEL` and `GEMINI_HTTP_PROXY` remain optional. To use Ollama as a fallback, set `AI_SECONDARY_PROVIDER=ollama` and set `OLLAMA_MODEL` to an installed model. `OLLAMA_BASE_URL` defaults to `http://127.0.0.1:11434`.

Apply migrations with `npm run migrate` from `backend` before sending Ark requests. PostgreSQL records reported prompt and completion tokens per attempted request in `ark_ai_attempts`. Set `ARK_DAILY_SPEND_LIMIT_MICROS` to cap estimated Ark spend across backend processes per UTC day. All three cost settings use millionths of your Ark billing currency. For example, a limit of one currency unit is `1000000`. Set `ARK_INPUT_COST_MICROS_PER_MILLION` and `ARK_OUTPUT_COST_MICROS_PER_MILLION` to your input and output rates per million tokens. An empty limit leaves spend uncapped and zero disables Ark calls. The service reserves estimated cost before a request and reconciles to reported usage. Requests without usage retain the estimate, and uncapped requests without rates track tokens only. Estimates use configured flat rates and can differ from Ark invoices.

`AI_ATTEMPT_TIMEOUT_MS` and `AI_TASK_TIMEOUT_MS` default to 15000 and 34000 milliseconds. The task timeout is shared across retries and fallback providers. The existing request quotas and rate limits still apply.

After adding the Ark key and model locally, run `RUN_ARK_LIVE_TEST=1 npm run test:ark-live` from `backend` against a migrated local database. The smoke test makes two small requests using synthetic English and Simplified Chinese prompts and checks structured responses and persisted token usage.

To enable the OpenAI-compatible adapter, select `openai-compatible` as the primary or secondary provider. Set `AI_OPENAI_COMPATIBLE_BASE_URL` to the API root including its version path, such as `http://127.0.0.1:8000/v1`. Set `AI_OPENAI_COMPATIBLE_MODEL` to a model served by that endpoint and `AI_OPENAI_COMPATIBLE_API_KEY` if it requires bearer authentication. Keep keys in the server environment and use HTTPS for remote endpoints. The endpoint must support Chat Completions with `response_format.type=json_schema` and `max_completion_tokens`. Successful responses identify the adapter as `openai-compatible`. The shared service applies its usual validation, quotas, and fallbacks.

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
psql -d career_compass -v ON_ERROR_STOP=1 -f backend/database/seed-expansion.sql
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

## Interactive API documentation

With the backend running on port 3000, open [Swagger UI](http://localhost:3000/api-docs). The [OpenAPI 3 document](http://localhost:3000/api-docs/openapi.json) is also available as JSON.

To complete an assessment, execute **POST /api/assessment/start** in Swagger UI. For a guest assessment, copy the returned `access_token` into **Authorize**. In **POST /api/assessment/answer**, submit the same assessment ID and the current question ID with an option ID or custom text. Repeat until `complete` is true. The response shows the clarification source and final personalization status, including the fallback reason when applicable.

## Career Match API

After running `npm run migrate`, use the **Career Match** section of Swagger UI.

| Method and path | Purpose |
| --- | --- |
| `GET /api/career-match` | Read the latest owned assessment match and current skill gaps and challenge activity. Accepts an account or guest bearer token and makes zero AI requests. |
| `POST /api/career-match/refresh` | Refresh and save the match for the latest completed assessment. Requires an account bearer token and accepts an optional `language` of `en` or `zh-CN`. |

Assessment completion saves the recommendation response, including the AI guidance or fallback status. Older assessments return their original saved professions until refreshed. Refresh uses the existing ranker with the saved answers and active catalog. It defaults to the current profile language. The profile, recorded skills, current gaps, and challenge activity inform Gemini guidance while assessment answers determine the scores.

The response includes both self-reported and practically assessed skill records when available. Practical challenge activity reports submissions and evaluations as practice history. Challenge points never change proficiency or rankings. GET shows current skill and challenge data alongside the last saved guidance. Call refresh to regenerate that guidance after profile or evidence changes. A refresh that encounters an AI outage saves the deterministic result and a fallback reason.

## My Roadmap API

Run the backend migrations and authorize in Swagger UI with a registered account token.

| Method and path | Purpose |
| --- | --- |
| `POST /api/roadmaps` | Generate and save a plan for a profession in your latest Career Match. |
| `GET /api/roadmaps` | List your saved plans, newest first. Use `next_offset` to fetch another page. |
| `GET /api/roadmaps/{id}` | Read a saved plan and its milestone progress. |
| `PATCH /api/roadmaps/{id}/milestones/{milestoneId}` | Edit a milestone, add or clear notes, or set `completed` to true or false. |

An empty create request uses the top match, your profile language, and 180 minutes of study per week. Supply `profession_slug`, `language` (`en` or `zh-CN`), or `weekly_study_minutes` (30 to 2400) to override those defaults. Each request saves a separate plan with three milestones for study, practice, and review.

Roadmaps use current skill gaps and practice history to select relevant catalog materials. Resource links include the actual learning language, which can differ from the roadmap language. Milestone estimates cover the suggested activity. Provider estimates, when available, refer to the listed resource. Progress reflects milestones you mark complete.

Gemini personalizes the actions and outcomes within the shared account quota and cache. A roadmap using rule-based guidance exposes the reason in `personalization`. Reading a plan and updating a milestone require zero AI calls.

## Career Assistant API

Run `npm run migrate` from `backend`, then open **Career Assistant** in Swagger UI at `/api-docs`. All operations require a registered account bearer token.

| Method and path | Purpose |
| --- | --- |
| `POST /api/career-assistant/conversations` | Create a conversation. Supply `en` or `zh-CN` as `language`, or use the account preference. |
| `GET /api/career-assistant/conversations` | List your conversations. Continue with `next_offset` when present. |
| `GET /api/career-assistant/conversations/{id}` | Read the most recent saved turns in chronological order. Use `next_before` to load the previous page. |
| `POST /api/career-assistant/conversations/{id}/messages` | Send a message with the current `revision` and optional context sources. Saves the message and reply together and returns the next revision. |
| `DELETE /api/career-assistant/conversations/{id}` | Permanently delete the conversation and its saved turns from the application database. |

A new conversation starts at revision `0`. If a message returns HTTP 409, reload the history before retrying. A duplicate submission rejected while the first reply is in progress does not spend another AI attempt. Omit `context` for general guidance. Select any of `profile`, `assessment`, `career_match`, `skills`, `roadmap`, and `practice` per turn. Roadmap context uses your latest saved My Roadmap, with milestone completion and progress totals. If you have no saved roadmap, it uses the learning steps saved in Career Match when available. Practice context includes challenge activity and interview metadata. Assessment context uses trait summaries. Email, raw assessment answers, skill and milestone notes, practice artifacts, and interview transcripts are excluded from the automatic context payload.

The selected context summary, the message, and up to four previous exchanges go to the configured AI providers. To share limited excerpts from a saved résumé, send `"resume_context": {"resume_id": "<uuid>", "consent": true}` on that turn. The backend verifies ownership and filters common contact patterns. Replies generated with résumé context remain visible in saved history and are omitted from future AI prompts. Other prior replies can contain information shared in earlier turns. The application disables AI response caching for these conversations. Deletion removes local history and cannot retract requests already sent to a provider. The assistant uses the shared AI provider configuration. Provider attempts count against the shared daily account allowance, including retries and failover. The API saves a bilingual local fallback when generation is unavailable, and guidance has no live vacancy or salary source.

Run `RUN_SKILLS_POSTGRES_TEST=1 npm test` against a disposable, migrated and seeded database to include the Assistant's HTTP/PostgreSQL tests.

## My Skills API

Run `npm run migrate` from `backend`, then authorize in Swagger UI with a registered account token. The `My Skills` section documents these endpoints.

| Method and path | Purpose |
| --- | --- |
| `GET /api/skills` | List your skill inventory with self-ratings and practical results |
| `POST /api/skills` | Add a skill, optional notes, and an optional self-rating |
| `PATCH /api/skills/{id}` | Change a skill or set and clear its self-rating |
| `DELETE /api/skills/{id}` | Remove a skill from your inventory |
| `POST /api/skills/compare` | Compare your inventory with one to five active careers |

Proficiency runs from 1 (beginner) to 5 (expert), with 3 representing independent use. Users can write `self_assessed_level`. Trusted backend assessment workflows can write a separate `practical_assessment` through `recordPracticalAssessment` with a result reference. The inventory retains both ratings and the comparison uses the practical rating when available. The existing `/api/profile` skills list remains a separate field.

Comparisons use the career catalog’s `market_pulse.key_skills` and level 3 as a planning target. Missing skills and shortfalls of two or more levels are high priority. A one-level shortfall is medium priority. An unrated skill is flagged for review. Ties favor gaps shared by more selected careers. Skill names are matched by normalized text and selected English–Chinese aliases.

Guidance covers up to five prioritized gaps. It defaults to the account language and accepts an explicit `en` or `zh-CN` override. AI calls share the account’s existing allowance. The response includes rule-based guidance if AI is unavailable, or when `include_ai` is false. Career and skill names retain their stored labels so clients can link to the original records.

Career Match, My Roadmap, Learning Hub, and future Resume integration can reuse `listUserSkills(database, userId)` and `compareSkillsToCareers(skills, careers)` without making AI calls.

After migrating and seeding the local database, run `RUN_SKILLS_POSTGRES_TEST=1 npm test` from `backend` to include the PostgreSQL integration tests. They roll back the fixtures and use simulated AI responses to verify the shared account allowance and evaluation handling.

## Practical Challenges and Learning Hub

Run `npm run migrate` from `backend` to add challenge submissions. Discovery supports `language=en` and `language=zh-CN`. A registered account bearer token is required to save work, request evaluation, and read progress.

| Method and path | Purpose |
| --- | --- |
| `GET /api/challenges` | Browse 100 challenges, with optional `career_field`, `profession_slug`, `skill`, and `difficulty` filters |
| `GET /api/challenges/{id}` | Read the scenario, deliverable, and rubric |
| `POST /api/challenges/{id}/submissions` | Save an `artifact` of up to 6000 characters, with an optional `language` |
| `POST /api/challenges/submissions/{id}/evaluate` | Request feedback using the saved rubric and the account's shared AI allowance |
| `GET /api/challenges/submissions/{id}` | Read an owned attempt and its evaluation |
| `GET /api/challenges/progress` | Read attempt counts, evaluation counts, and latest status per challenge |
| `GET /api/learning/resources` | Browse 169 resources, with optional `career_field` and `skill` filters |

Evaluation sends plain text to the configured AI provider. The API sums rubric points from validated criterion results and attaches evidence quoted from the submitted text. Points describe the submitted practice artifact. Matching skills in `GET /api/skills` show a separate `challenge_practice` summary.

While another request is evaluating the same submission, the evaluation endpoint returns HTTP 202. If the provider is unavailable, the submission retains its artifact and exposes the failure reason. It can be evaluated again later. Swagger UI includes example requests under **Practical Challenges** and **Learning Hub**.

## Interview Simulator API

Run `npm run migrate` from `backend` to create the interview history table. Sign in with a registered account and use its bearer token in **Interview Simulator** in Swagger UI.

| Method and path | Purpose |
| --- | --- |
| `POST /api/interviews` | Start an interview with an active `profession_slug`, `difficulty` of `beginner`, `intermediate`, or `advanced`, and optional `language` of `en` or `zh-CN` |
| `GET /api/interviews` | List your sessions with answer progress and available scores, 20 per page. Pass `next_offset` as `offset` to continue |
| `GET /api/interviews/{id}` | Resume an interview or read its transcript and feedback |
| `POST /api/interviews/{id}/answers` | Submit the current `question_id` and up to 1500 characters of `answer` |
| `POST /api/interviews/{id}/evaluate` | Evaluate a completed interview or retry an unavailable evaluation |

Choose a slug returned by `GET /api/careers`. The simulator selects three questions at the chosen difficulty, prioritizing profession tags and filling from the same career field. After each main answer, the AI provider selects a follow-up from the bank and can personalize it with a quote from the answer. A bank follow-up is available when the provider is unavailable. Answer the `current_question` in each response until the session is `completed`.

Request evaluation after all six answers. The evaluator applies the bank's 0–2 rubric to the main answers and follow-ups, returning criterion feedback, strengths, mistakes or omissions, and improvement suggestions. The score describes the practice transcript. Follow-ups and evaluation share the existing daily account allowance. While a request is processing, use `GET /api/interviews/{id}` to check progress. An unavailable evaluation saves the transcript and a failure reason. The scores and feedback become available after a successful evaluation.

## My Resume API

Run the backend migrations and use a registered account bearer token. File extraction requires Python 3 and Poppler's `pdftotext` on the backend's PATH. Structured resume creation and editing work independently of the extractors.

| Method and path | Purpose |
| --- | --- |
| `POST /api/resumes` | Create a resume with a title and optional structured sections. |
| `POST /api/resumes/upload` | Send a raw PDF or DOCX body with its document `Content-Type`. Optional query parameters are `title` and `language`. |
| `GET /api/resumes` | List your resume metadata. Use `next_offset` for the next page. |
| `GET /api/resumes/{id}` | Read your resume, including sections and extracted text. |
| `PATCH /api/resumes/{id}` | Edit the title, language, or selected sections. An empty section array clears that section. |
| `GET /api/resumes/{id}/file` | Download the private original document. |
| `POST /api/resumes/{id}/analyze` | Get improvement suggestions with `{"consent":true}` and an optional `target_role`. |
| `DELETE /api/resumes/{id}` | Remove the resume, original bytes, and extracted text from the active database. |

The file limit is 5 MiB. Extraction reads the first 30 PDF pages or the DOCX main document and accepts up to 40,000 characters of extracted text. Image-only documents need a text layer. Uploaded text is available for review before entering structured skills, education, work experience, projects, and certifications. The resume language defaults to the account preference and supports `en` and `zh-CN`.

To opt in for a single request, send `"resume_context": {"resume_id":"<owned resume UUID>","consent":true}` to Career Match refresh, My Skills compare, My Roadmap create, or Interview Simulator evaluate. The response includes temporary `resume_guidance`. Resume excerpts are labeled as user claims. The AI provider chooses from grounded improvement actions using the shared account quota and uses localized rule-based suggestions when unavailable.

Original files and text are private PostgreSQL data. Resume excerpts and guidance are kept out of saved personalization and the AI result cache. Explicit consent permits the configured provider to receive selected excerpts. Database backups and provider retention follow their own retention policies.

## Profile, account security, and settings

The frontend integration at `ed72a66` saves display name, country, and career goals through the existing profile API. The username, remaining personal details, photo, and settings currently live in browser state. Its password and email change and account deletion controls are placeholders. The backend contract below supports wiring those controls to PostgreSQL.

| Client area | Backend contract |
| --- | --- |
| Sign Up | `POST /api/auth/register` accepts optional `username` and `preferred_language` (`en` or `zh-CN`). A guest token still promotes the guest and keeps their assessment history. New email addresses start unverified. |
| My Profile | `GET/PATCH /api/profile` supports `username`, `first_name`, `last_name`, `date_of_birth`, `city`, `current_status`, and `about_me` alongside existing fields. Use `career_goals` for the career goal. Usernames use 3–20 ASCII letters, digits, underscores, or dots and are stored in lowercase. |
| Profile photo | `GET/PUT/DELETE /api/profile/photo` uses an account token. Upload a raw JPEG, PNG, or WebP body up to 5 MiB. ImageMagick 7 (`magick` on PATH) decodes and resizes the image and strips metadata before PostgreSQL stores it. |
| Settings | `GET/PATCH /api/settings` reads or updates `preferred_language`, `privacy_settings`, and `notification_settings`. Send only the fields to change. |
| Public profile | `GET /api/profile/public/{username}` and its `/photo` subresource serve explicitly published fields. The default is private. Email and date of birth stay private. |
| Notifications | `GET /api/notifications` lists the account’s English or Simplified Chinese inbox. Use `next_before` as the next request’s `before` parameter. `PATCH /api/notifications/{id}/read` marks an item as read. |

In-app notifications cover completed assessments, new roadmaps, and completed milestones when their category is enabled. Preferences for job alerts, learning reminders, platform announcements, and optional email notifications are saved for future delivery integrations. Security email is sent separately from optional notification preferences.

| Account operation | Request |
| --- | --- |
| Verify email | Call `POST /api/auth/email-verification/request` with the account token, then `POST /api/auth/email-verification/confirm` with `code`. |
| Change email | Call `POST /api/auth/email-change/request` with the new `email` and `current_password`, then `POST /api/auth/email-change/confirm` with the code sent to the new address. Both calls require the account token. |
| Recover a password | Call `POST /api/auth/password-reset/request` with `email` and optional `language`, then `POST /api/auth/password-reset/confirm` with `email`, `code`, and `new_password`. These calls are public. Passwordless legacy accounts use this flow to prove mailbox ownership and retain their assessment data. |
| Change a password | Call `POST /api/auth/password/change` with the account token, `current_password`, and `new_password`. |
| Delete an account | Call `DELETE /api/auth/account` with the account token, `current_password`, and `confirmation: "DELETE"`. PostgreSQL deletes the account and its linked data from the active database. |

Email codes are eight-digit strings, expire after 10 minutes, and allow five incorrect attempts. Rate limits are stored in PostgreSQL. After an email change, password change, or recovery, discard the old bearer token and sign in again. Verification status is available as `email_verified_at` on the profile and account endpoints.

For transactional email, configure `ACCOUNT_EMAIL_PROVIDER=resend`, `ACCOUNT_EMAIL_FROM` with a verified sender, and `RESEND_API_KEY`. The server chooses the message language from the account preference or recovery request. The integration suite uses an injected test mailer to verify the account flow without sending email.

## Adaptive assessment API

The hybrid assessment asks 6 general questions, 8 adaptive questions selected from the 105-question bilingual bank, and 4 personalized clarification questions. The adaptive stage covers all seven bank categories and at least two interdisciplinary questions. New bank options carry deterministic weights. Custom answers and notes on new items provide context for AI analysis. Gemini prepares the clarification batch after answer 14. Each clarification uses one distinct topic and a validated reference to a previous answer. The API supplies predefined clarification questions when AI cannot provide a valid question.

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

Each assessment has one logical AI request for clarification and one for final guidance. The additive guest-budget migration creates `guest_assessment_ai_usage`. A guest can use provider attempts in one assessment per UTC start date, with up to `AI_GUEST_STAGE_ATTEMPTS` attempts each for clarification and final guidance (default 2). A direct `/evaluate` request uses the final allowance for its own assessment. The shared registered-account allowance is `AI_ACCOUNT_DAILY_LIMIT` (default 5). A value of zero disables the corresponding guest or registered-account provider allowance.

Each backend process enforces `AI_MAX_ATTEMPTS_PER_MINUTE` per rolling minute (default 10) and `AI_MAX_ATTEMPTS_PER_DAY` per UTC day (default 450) across providers. Initial requests are spaced by `AI_MIN_REQUEST_INTERVAL_MS` (default 3000), and interactive final guidance can briefly wait for that window. Requests use bounded exponential backoff with jitter, honor provider `Retry-After` cooldowns, and have a 15-second attempt timeout within a 34-second task budget. Cache hits for the same user, providers, and request expire after five minutes and leave usage allowances available.

When Gemini fails and the secondary provider is configured, it can use a remaining attempt. If both providers fail or a limit is reached, the API preserves assessment progress and uses predefined clarification questions or deterministic guidance. `personalization.status` and `personalization.reason` describe final guidance independently of `clarifications.status`. A guest who has exhausted the session budget receives `session_limit`.

When the backend removes an unsupported claim from the generated overview or a role explanation, `personalization.filtered_fields` identifies the replaced overview and counts the removed explanations. The response keeps the validated roadmap and rule-based role explanations.

## Authentication and profiles

Authentication uses expiring bearer tokens signed with `AUTH_TOKEN_SECRET`. Passwords are stored as salted scrypt hashes. Registration requires an email and a 10–128 character password. Login uses the same email and password. Guests can be created explicitly with `POST /api/auth/guest`, or are created by an unauthenticated assessment start. Keep the returned guest token so the assessment can be continued and results can later be transferred.

Register with a guest token in the `Authorization` header to promote that guest row to an account. Completed assessments remain attached to the promoted account. To move completed guest assessments to an existing account, sign in to that account and call `POST /api/auth/transfer` with `{ "guest_access_token": "<guest token>" }`. The transfer is transactional. It moves completed assessment history and keeps the source guest row to avoid invalidating an in-progress assessment.

`GET /api/auth/me` returns the authenticated identity. Registered users can read and update optional profile fields at `GET /api/profile` and `PATCH /api/profile`. Supported fields are `display_name`, `country`, `preferred_language` (`en` or `zh-CN`), `age_group`, `education`, `work_experience`, `interests`, `skills`, and `career_goals`. Omit fields that are not being changed. Set a text field to `null` or an empty string to clear it, and use an empty array to clear interests or skills.

The reusable user context service combines profile data and the latest assessment, and accepts future skills and CV data without persisting CV content.

Available auth routes are `POST /api/auth/guest`, `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/transfer`, and `GET /api/auth/me`. Profile routes require a registered bearer token. Authentication responses contain `access_token`, `token_type`, and `user`.

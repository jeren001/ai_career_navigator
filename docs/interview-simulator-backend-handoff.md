# Interview Simulator backend handoff

This document describes the frontend delivered through STEP 10 and proposes STEP 11 API contracts for backend-team review. The current simulator runs in the browser. Production delivers user-authored questions and explicitly reports unavailable generated questions, evaluations, insights, and practice plans.

## A. Frontend architecture

| Route under `/interview-simulator` | Page and responsibility |
| --- | --- |
| Root | `InterviewSimulator.jsx` shows type selection, the latest five records, and an unfinished-session link. |
| `/technical`, `/behavioral`, `/general` | Type-specific setup pages share `InterviewSetup.jsx` and `SetupFrame.jsx`. |
| `/custom` | `CustomInterviewSetup.jsx` adds job details, selected interview types, authored questions, and instructions. |
| `/session?id=<sessionId>` | `InterviewSession.jsx` loads a saved session and coordinates timing, draft autosave, answers, skips, pause/resume, and completion. |
| `/results/:sessionId` | `InterviewResults.jsx` loads finalized sessions, validates evaluation data, and displays reviews and a print-ready report. |
| `/history` | `InterviewHistory.jsx` lists, filters, sorts, resumes, retakes, exports, and deletes workspace records. |
| `/progress` | `InterviewProgress.jsx` derives analytics and comparison data from workspace records. |

All routes are lazy-loaded and reuse `InterviewHeader.jsx`, the existing Dashboard drawer, and color and spacing tokens. React controls form state, confirmations, review filters, and chart interaction. Setup drafts are tab- and workspace-scoped in sessionStorage. Session records and evaluations are stored in IndexedDB. The repository serializes same-tab operations and uses read/write transactions for shared data.

- `interviewSessionRepository.js` provides `start(configuration, { replaceId })`, `get(id)`, `getWithEvaluation(id)`, `list()`, `getUnfinished()`, `update(id, action)`, `getEvaluation(id)`, `saveEvaluation(id, response)`, `remove(id, { includeUnfinished })`, and `removeAll({ includeUnfinished, expectedIds })`. Browser-local writes use atomic state transitions.
- `interviewQuestionProvider.js` provides `createInterviewQuestionProvider(adapter)` and `getQuestion({ sessionId, configuration, index, requestKey, history, signal })`. Question request history includes delivered questions, submission outcomes, and exact submitted text. Drafts stay outside that history. The backend adapter should replace this context with authoritative, authorized records.
- `interviewEvaluationProvider.js` provides `createInterviewEvaluationProvider(adapter)`, `getEvaluation({ session, signal })`, and `validateInterviewEvaluation(response, session)`.
- `interviewCoachingProvider.js` defines asynchronous `getInsights(request)` and `getPracticePlan(request)` adapter boundaries. Both default to unavailable. Plan generation and updates can be added as provider methods when contracts are agreed.
- `useInterviewRecords.js` shares the repository read path across Home, History, and Progress. The history, results, and analytics models derive view data; they never make network requests.

## B. Data models

Types below describe serialized data. IDs are opaque strings scoped to their owning session or workspace. Current timestamps use Unix milliseconds except evaluation timestamps, which use ISO 8601 strings. The proposed API should preserve that convention or normalize it at a boundary.

| Model | Fields and constraints |
| --- | --- |
| Interview configuration | `interviewType:` technical, behavioral, general, or custom; `format: "text"`; trimmed `role:string`; `experience:` student, junior, mid-level, senior; `difficulty:` easy, medium, hard; `questionCount:5\|10\|15\|20`; `durationMinutes:15\|30\|45\|60\|null`; `language:` en, pt, zh, es, fr, nl, ru. Technical requires nonempty `skills:string[]`. Behavioral and General require nonempty `topics:string[]`. |
| Custom configuration | `types:string[]` with at least one distinct subtype. Requires nonempty `skills`, `behavioralSkills`, or `generalTopics` only for active types. Includes `companyName`, `jobDescription`, and `instructions` strings, empty when omitted, and an ordered `customQuestions:string[]` bounded by the total question count. Authored entries are trimmed and deduplicated. |
| Session | `version:number`, `id:string`, `interviewType`, `configuration`, `questions:Question[]`, zero-based `questionIndex:number`, `answers:Answer[]`, `skipped:Skip[]`, `unfinishedAnswers:Record<questionId,string>`, `status`, timing fields, and `completionReason`. Status is waiting, active, paused, or completed. Completion reasons are all-questions-completed, time-expired, and ended-early. |
| Timing | `createdAt:number`; nullable `startedAt`, `completedAt`, `pausedAt`, `runningSince`; `elapsedMs:number`; nullable `remainingMs` for Unlimited. The first delivered question starts the clock. Paused time is excluded. Finished sessions retain the timing snapshot and reason. |
| Question | `id:string`, `category:string`, `content:string`, `source: "custom" \| "provider"`, and optional `followUpTo:string`. Development fixtures use a separate source and are excluded from production bundles. IDs are unique per session. A follow-up can reference only an earlier answered question. |
| Submitted answer | `questionId:string`, exact nonblank multiline `text:string`, `submittedAt:number`. Each question position is handled once. |
| Skipped question | `questionId:string`, `skippedAt:number`. A skipped question can retain a separate unfinished draft. |
| Unfinished answer | A question-ID-to-text map, distinct from submitted answers. Text can be incomplete; the backend must not use it as submitted answer context. |
| Evaluation result | `sessionId:string`, `status`, then valid completed fields `overallScore:number`, `performanceLevel:string`, `methodology:{id:string,version:string}` (optional for legacy results), `evaluatedAt:string`, `categories:[{id,label,score}]`, `questions:[{questionId,score?,feedback?,suggestedAnswer?,howToImprove?,needsImprovement?}]`, optional `feedback:{overall?,strengths?,improvements?,recommendations?}` and optional `practiceFocus:[{type,entries}]`. |
| History item | Local repository returns `{session,evaluation}`. Proposed remote list summaries include ID, title, date, duration, status, completion reason, answer count, evaluation status, and optional valid overall score. Details and reports load the selected record by ID. |
| Performance analytics | Matching totals and practice duration, nullable average/best scores, chronological score points, compatible trends, per-category score and support count, activity buckets, streaks, and pairwise comparison data. Preserve missing scores as null. |
| AI insights | Proposed `{status, insightId?, methodology?, generatedAt?, sections?}`. Sections can include overall analysis, most improved and strongest skills, areas for improvement, recurring difficulties, and recommended topics, with authorized evidence references. Content is provider-driven. |
| Personalized practice plan | Proposed `{id, revision, status, generatedAt, updatedAt, types, topics, prioritySkills, difficulty, frequency, estimatedMinutes, shortTermGoals, longTermGoals, checkpoints, sessions}`. A checkpoint can carry a target date and progress criteria. Recommended sessions contain editable configuration drafts and rationale. |

Structural example for the create request:

```json
{
  "configuration": {
    "interviewType": "technical",
    "format": "text",
    "role": "<job role>",
    "experience": "junior",
    "difficulty": "medium",
    "skills": ["<selected skill>"],
    "questionCount": 5,
    "durationMinutes": 15,
    "language": "en"
  }
}
```

A generated question response can be `{ "status": "available", "question": { "id": "<question ID>", "category": "<category>", "content": "<question text>", "source": "provider", "followUpTo": "<earlier answered ID>" }, "revision": 4 }`. Omit `followUpTo` for independent questions. Pending and unavailable responses contain their status plus any retry or availability metadata, without a question.

## C. Proposed API contracts

Use authenticated HTTPS requests under `/api/interview-simulator/v1`. The API derives the account and workspace from authenticated membership and checks ownership and permissions on every call. A client's local workspace key is not proof of identity. For state-changing requests, use an `Idempotency-Key` scoped to the caller and operation, and a server `expectedRevision` for ordered session and plan mutations. A repeated key returns the committed response. Reject key reuse with a materially different request. Revision conflicts return the latest permitted revision and require reconciliation before retry. For next-question polling, reuse the same request key for the same slot and return the same committed question when ready.

| Operation | Proposed request | Response and retry |
| --- | --- | --- |
| Create session | `POST /sessions` with `configuration`, optional `replaceSessionId` and explicit replacement intent | `201 {session,revision}`; `409` if an unfinished session exists. Retake uses a new key and session ID. |
| Retrieve session | `GET /sessions/{id}` | `200 {session,revision,serverTime}`; safe retry; reconcile expiry. |
| Generate next question | `POST /sessions/{id}/questions/next` with `expectedIndex`, `expectedRevision`, stable slot key | `200 {status,question?,revision}` or `202 {status:"pending",retryAfterMs}`. Duplicate requests share the committed slot. |
| Save draft | `PUT /sessions/{id}/questions/{questionId}/draft` with `text,expectedRevision` | `200 {revision,savedAt}`; retries replay the same write and stale revisions cannot replace a newer draft. |
| Submit answer | `POST /sessions/{id}/answers` with `questionId,text,expectedRevision` | `200 {session,revision}`; atomic write and advancement. |
| Skip question | `POST /sessions/{id}/skips` with `questionId,expectedRevision` | `200 {session,revision}`; atomic handling and advancement. A saved draft stays separate. |
| Pause or resume | `POST /sessions/{id}/pause` or `/resume` with `expectedRevision` | `200 {session,revision,serverTime}`; backend maintains elapsed time and pause state. |
| Complete interview | `POST /sessions/{id}/complete` with `expectedRevision` and explicit end request | `200 {session,revision}`; backend determines and preserves completion reason and timing. |
| Request evaluation | `POST /sessions/{id}/evaluation` with optional supported rubric version | `202 {sessionId,status}`; deduplicate by session revision and methodology. Only finalized sessions are eligible. |
| Retrieve evaluation | `GET /sessions/{id}/evaluation` | `200 EvaluationResult`; pending or processing responses may specify when to poll. |
| Retrieve history | `GET /history` with cursor, limit, search, date, type, status, evaluation status and sort | `200 {items,nextCursor,total?}`; deterministic ordering with an ID tiebreaker. |
| Delete interview | `DELETE /history/{id}` with optional explicit unfinished consent and expected revision | `204`; confirms ownership and protects active sessions by default. Repeated authorized deletions are idempotent. |
| Delete history | `POST /history/bulk-delete` with expected scope snapshot or ID set and `includeUnfinished` | `200 {deletedIds}`; workspace-scoped atomic deletion or a conflict if the confirmation set changed. |
| Retrieve analytics | `GET /analytics` with time range, timezone, type, role, and difficulty | `200 {summary,types,activity,scoreSeries,categories}`; deterministic aggregation, actual counts and optional validated scores. |
| Generate insights | `POST /insights` with filter scope and explicit context permissions | `202 {insightId,status}`; deduplicate by scope and source revision. `GET /insights/{id}` retrieves the result. |
| Generate practice plan | `POST /practice-plans` with authorized goals and optional insight reference | `202 {planId,status}`; retry by idempotency key. `GET /practice-plans/{id}` retrieves it. |
| Update practice plan | `PATCH /practice-plans/{id}` with `expectedRevision`, goals or feedback, and requested changes | `200 {plan,revision}` or `202 {planId,status}` for asynchronous regeneration. |

Suggested error envelope `{ error: { code, message, fieldErrors?, retryAfterMs?, currentRevision? }, requestId }`. Use `400/422` for malformed or invalid requests, `401` for unauthenticated callers, `403/404` for denied or inaccessible resources without disclosing ownership, `409` for state or idempotency conflicts, `429` for rate limits, and `503` for transient outages. Retry safe reads and explicitly retryable mutations with bounded backoff. Respect retry hints. Invalid, denied, and stale requests require changed input or authorization.

## D. Adaptive AI interview architecture

The backend assembles a scoped context for each session and expected question slot. Eligible inputs include User Profile, CV Builder, AI Career Test, My Skills, Career Match, Career Goals, Interview History, Previous Interview Answers, Job Description, Interview Configuration, and Custom Instructions. Retrieve only relevant fields from sources the authenticated user has authorized. Keep source ownership, purpose, and consent checks outside the model. The AI receives the minimum necessary context and never receives general database access or permission to call arbitrary data tools.

An orchestrator can ask the AI to generate one original question at a time. The interviewer can choose topics, sequencing, and difficulty within the selected configuration; explore genuine projects and experiences; probe submitted answers with contextual follow-ups; identify relevant knowledge gaps; and avoid unnecessary repetition. User-authored questions remain part of the configured budget. The AI may choose when to present them. The orchestrator validates the returned question, checks the remaining question/time budget, commits a stable question ID, and records any follow-up relationship. Delivered questions retain their order and content. A retake receives a new session ID and may receive different questions.

After completion, the AI can evaluate submitted answers, provide personalized feedback and recommendations, and create or update an editable practice plan. The backend controls authentication, authorization, privacy, timing, limits, session integrity, and persistence. Avoid model decisions that alter server-owned state without validation and an authorized transition.

## E. Evaluation architecture

| Type | Supported categories |
| --- | --- |
| Technical | Answer Accuracy, Technical Knowledge, Problem Solving, Answer Relevance, Communication, Depth of Knowledge |
| Behavioral | Communication, Answer Structure, Situational Awareness, Problem Solving, Professional Judgment, Relevance of Examples |
| General | Communication, Answer Clarity, Answer Relevance, Professional Awareness, Motivation, Answer Structure |
| Custom | Union of the active subtype categories, deduplicated by canonical identifier |

Proposed transitions are unavailable → pending → processing → completed or failed. An explicit retry can move failed evaluations back to pending. A completed evaluation is immutable for that session revision and methodology; a newly approved rubric requires a new versioned evaluation process rather than silently rewriting historical results. The frontend validates session ID, status, finite scores between 0 and 100, canonical category IDs and uniqueness, answered-question ownership, timestamp, and optional feedback, suggestions, improvement flags, and practice focus.

Review and PDF can show overall scores, performance labels, category scores, individual question feedback, suggested answers, strengths, areas for improvement, and recommendations when supplied by the validated provider. Skipped and unanswered questions receive no score. A supplied overall score and rubric determine the performance label. This handoff proposes no scoring weights. Published score comparisons and trend labels require compatible type mix, difficulty, and methodology ID/version. Actual practice statistics remain independent of evaluation.

## F. Security and privacy

- Authenticate and authorize every read and write at the server. Verify account, workspace, record ownership, permissions, and allowed data-source scope. Deny cross-tenant access and fail closed on missing context permission.
- Treat CVs, job descriptions, answers, custom questions and instructions as untrusted user data. Delimit them from system instructions, reject prompt attempts to invoke tools or request unrelated data, validate structured output, and constrain tool permissions server-side. Never allow user content or model output to select identities, change access scope, or override timing and question limits.
- Apply request schema validation, payload length and resource limits, rate limits by account and operation, timeout and cancellation handling, and safe text rendering. Treat model output as untrusted. Keep provider keys and prompts containing secrets server-side.
- Minimize context, avoid raw CV or answer text in routine logs, and retain purpose-limited audit events with request ID, authorization outcome, source references, and privileged mutations. Define retention, access review, deletion, backups, and export policies before deployment. Delete or quarantine corresponding evaluation and insight data when the user deletes the source record according to the agreed retention policy.

## G. Persistence and synchronization

IndexedDB `ai-career-interviews` stores sessions under `[workspace,id]`, with the optional validated evaluation attached separately from session statistics. A tombstone retains only workspace and ID after deletion to stop legacy replay. Original IDs and question content survive migration from legacy sessionStorage. Migration removes the source only after a successful commit or proven matching outcome. Divergent or malformed legacy entries are preserved for diagnosis. Unbound legacy copies are imported only in the original local workspace. Setup drafts are separate workspace-keyed sessionStorage records.

IndexedDB persists across tab closure within the same browser profile and origin. Browser storage controls, clearing site data, private browsing, and quota can affect recovery. Sign-out rotates the local workspace rather than authorizing another user to read old data. This is browser-local isolation with no authenticated identity or cross-device recovery.

For remote migration, define explicit user consent, origin and tenant ownership, data validation and deduplication by stable IDs, and resumable per-record import receipts. Retain original local data until an acknowledged server commit. Use server revisions and timestamps for conflict resolution and a versioned idempotency ledger. A stale answer must never overwrite a submitted answer or advance the wrong question. Multiple tabs can edit the same current local draft and the last committed edit wins; a stale question or phase is rejected. Remote synchronization must define a clear policy for comparing drafts, completion, and tombstones across devices.

## H. Pending STEP 11 integration

| Capability | Frontend connection point |
| --- | --- |
| Authenticated session CRUD, server timing, ordered state transitions, workspace listing and deletion | `interviewSessionRepository.js`, `SetupFrame.jsx`, `InterviewSession.jsx`, `useInterviewRecords.js`, `HistoryDeletion.jsx` |
| Adaptive questions, authorized context, idempotency, backend evaluation of answer context | `createInterviewQuestionProvider`, `useSessionQuestion.js`, `SessionQuestion.jsx` |
| Evaluation generation, retrieval, retry and versioned comparisons | `createInterviewEvaluationProvider`, `InterviewResults.jsx`, `EvaluationSections.jsx`, `QuestionReview.jsx`, `InterviewReport.jsx` |
| Authorized history and analytics, cross-device recovery, import and deletion sync | `InterviewHistory.jsx`, `RecentInterviews.jsx`, `InterviewProgress.jsx`, existing repository and analytics models |
| AI insights, practice plans, updates and editable recommended sessions | `createInterviewCoachingProvider`, `ProgressCoaching.jsx`, `restoreInterviewSetup` |
| End-to-end checks using authorized production evaluation data | Score sort and average, score and radar charts, tooltips, compatible score changes, validated feedback and PDF sections, evaluation-driven practice actions and refreshed plans |

Production currently uses no network calls to question, evaluation, or coaching services. Sign-in and cross-device synchronization are outside this frontend delivery.

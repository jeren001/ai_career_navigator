# Profile and account integration

This frontend uses the account APIs introduced by backend migration `009_profile_account_settings.sql`. Apply the migrations from `backend` with `npm run migrate`, then run the frontend with `VITE_API_BASE_URL` pointing to that API.

- Registration saves the normalized username and selected language. Sign-in and session restoration hydrate profile fields from the API. Prior usernames saved only in an older browser should be re-entered under **My Profile** so the server can check availability.
- Profile changes use `PATCH /api/profile`. Private photos use authenticated `GET`, `PUT`, and `DELETE /api/profile/photo`. Uploads require ImageMagick 7 (`magick`) on the backend host. The server accepts JPEG, PNG, or WebP up to 5 MiB and stores a normalized image in PostgreSQL.
- Privacy, locale, and notification preferences use `GET/PATCH /api/settings`. The notification menu reads `GET /api/notifications` and uses `PATCH /api/notifications/:id/read`. The backend currently delivers in-app assessment recommendations and roadmap events. Job alerts, learning reminders, platform updates, and general notification emails are saved as preferences and still require delivery integrations.
- Verification, email changes, and password recovery require transactional email. Configure `ACCOUNT_EMAIL_PROVIDER=resend`, `ACCOUNT_EMAIL_FROM` with a verified sender, and `RESEND_API_KEY` on the backend. The frontend never sees mail-provider credentials. Test mailers can be injected into the backend app for local integration tests.
- A successful email change, password change, password reset, or account deletion clears the frontend session. Email and password changes revoke the old token on the server. Account deletion requires the current password and an explicit `DELETE` confirmation.

## Dashboard

Registered users can open **Check Your Progress** to load `GET /api/dashboard?language=en` or `language=zh-CN`. It shows persisted account counts, the latest assessment draft and active roadmap progress, saved recommendations, and recent events. Detailed challenge progress still uses its existing endpoints. Guest accounts retain the sign-up prompt.

## AI Assistant

Use the latest backend with migration `015_personal_progress.sql` applied. The registered-account page uses `/api/career-assistant/conversations` for chat, history, and deletion. The selected conversation is in `/ai-assistant?conversation=<id>` so refresh and browser navigation restore it through the owner API.

Conversation titles and pins use the conversation PATCH endpoint. Response saves use the per-turn bookmark PUT endpoint, and Saved Responses uses the paginated bookmark list. When there is no custom title or preview, history uses the first saved user message. Editing or regenerating saved turns still requires API support.

When Swagger advertises Resume context support, the Assistant lists saved resume titles. It shares excerpts only after explicit selection and consent for that send attempt. A retry requires fresh consent. Existing replies can contain context shared in earlier turns. The backend handles OpenRouter and fallback selection.

### Assistant migration compatibility

The runner records full migration filenames. Current upstream `008_career_assistant.sql` can run on a database already initialized by the integration branch's `010_career_assistant.sql`. Preserve both ledger entries where already applied. Resume `008_my_resume.sql` and guest budget `010_configurable_guest_ai_budget.sql` are separate migrations. Migration `015_personal_progress.sql` adds persisted titles, pins, and bookmarks.

A rehearsal applied the old integration migrations to a disposable PostgreSQL database, inserted a conversation and turn, upgraded with the latest backend migrations, then reran migrations. Both Assistant ledger entries and the old saved turn were retained. Use the backend's `API_INTEGRATION.md` for the deployment sequence and verify the same upgrade against a backup before applying it to a deployed database.

The Job Finder MVP remains on its separate worktree. Live job listings and job alerts still require a provider integration.

## My Resume

The registered-account route `/resume` uses the Resume API with migration `016_resume_editor_support_jobs.sql`. PostgreSQL stores the title, language, five standard sections, contact fields, template, font family, accent color, whole-point font size, custom sections, and draft progress. Signing into a fresh browser restores those fields. Custom section entries are saved as ordered plain text, so their content survives even when the browser's richer entry layout is unavailable.

Photos, full page-layout settings, and other editor fields outside the API schema stay in account-scoped browser storage. Earlier IndexedDB-only CVs remain in their original store and are not silently linked to an account.

PDF and DOCX exports retain the browser's existing rendering tools. Raw PDF or DOCX upload stores the original and opens **Review extracted fields**. Suggestions start unchecked. Applying a contact suggestion updates only that field. Accepted section entries append without duplicating identical saved entries. Review can be reopened from the record's action menu. PDF extraction requires a text layer and Poppler on the backend. The original remains available for download. Duplicating a record copies its structured data and available design, with the original upload remaining on the source record.

Analysis and target-role feedback require an explicit consent checkbox for each request. The backend returns suggestions for review, including basic suggestions if AI is unavailable. The editor does not apply suggestions automatically. ATS scores and AI translation are outside the current API. International templates and document rendering languages remain client-side features. Some inherited advanced studio controls use English labels. The shared frontend router uses React Router's data router so the editor's unsaved-change navigation blocker can work.

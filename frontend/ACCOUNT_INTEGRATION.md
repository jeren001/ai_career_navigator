# Profile and account integration

This frontend uses the account APIs introduced by backend migration `009_profile_account_settings.sql`. Apply the migrations from `backend` with `npm run migrate`, then run the frontend with `VITE_API_BASE_URL` pointing to that API.

- Registration saves the normalized username and selected language. Sign-in and session restoration hydrate profile fields from the API. Prior usernames saved only in an older browser should be re-entered under **My Profile** so the server can check availability.
- Profile changes use `PATCH /api/profile`. Private photos use authenticated `GET`, `PUT`, and `DELETE /api/profile/photo`. Uploads require ImageMagick 7 (`magick`) on the backend host. The server accepts JPEG, PNG, or WebP up to 5 MiB and stores a normalized image in PostgreSQL.
- Privacy, locale, and notification preferences use `GET/PATCH /api/settings`. The notification menu reads `GET /api/notifications` and uses `PATCH /api/notifications/:id/read`. The backend currently delivers in-app assessment recommendations and roadmap events. Job alerts, learning reminders, platform updates, and general notification emails are saved as preferences and still require delivery integrations.
- Verification, email changes, and password recovery require transactional email. Configure `ACCOUNT_EMAIL_PROVIDER=resend`, `ACCOUNT_EMAIL_FROM` with a verified sender, and `RESEND_API_KEY` on the backend. The frontend never sees mail-provider credentials. Test mailers can be injected into the backend app for local integration tests.
- A successful email change, password change, password reset, or account deletion clears the frontend session. Email and password changes revoke the old token on the server. Account deletion requires the current password and an explicit `DELETE` confirmation.

## AI Assistant

Apply migration `010_career_assistant.sql` to enable the Assistant on this integration branch. The registered-account page at `/ai-assistant` uses `/api/career-assistant/conversations` for messages, history, and deletion. Each turn uses the current revision and sends only the optional context sources selected for that turn. Existing replies can contain context shared in earlier turns.

The backend can use Gemini with `GEMINI_API_KEY` or a configured local Ollama provider. If generation is unavailable or the shared quota is exhausted, the UI labels the saved local fallback. Custom titles, pins, and saved responses last while the page is open. Editing or regenerating a saved turn requires additional API support.

The backend job search branch contains a provider plan. Live job listings and job alerts still require an implemented provider integration.

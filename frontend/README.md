# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Connecting to the Career Navigator API

1. Install the frontend dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the Express server origin or reverse-proxy prefix, without the `/api` suffix. The default is `http://localhost:3000`. Set the value before starting Vite or building the frontend. It is public configuration.
3. Run `npm run dev`. The backend needs a seeded PostgreSQL database, its current migrations, and a configured `AUTH_TOKEN_SECRET`. Consult the backend branch's README and `/api-docs` for setup.
4. Run `npm test`, `npm run lint`, and `npm run build`. Configure the deployment host to serve the frontend entry page for direct visits to React Router routes.

### Connected pages

| Page | Backend integration |
| --- | --- |
| Home | Public career list and numeric-ID detail from `GET /api/careers` and `GET /api/careers/:id`. The command bar filters the loaded catalog locally. Continue as guest uses `POST /api/auth/guest`. |
| Sign In | `POST /api/auth/login` with email and password. Sign-in uses tab storage by default. Remember me opts into persistent browser storage until the API token expires or the user signs out. |
| Sign Up | `POST /api/auth/register` with email, password, and display name. Sending the current guest bearer token upgrades that guest in place. Password confirmation stays in the browser. |
| Dashboard | Protected by bearer identity from `GET /api/auth/me`. Registered accounts can open `GET /api/challenges/progress`. Display names and progress come from the API. |
| About | Static content. |

Logout removes the browser's session token. The current API has no logout, token revocation, or refresh endpoint. On protected requests, a `401` clears the active session. The language selector applies English or Simplified Chinese within the frontend, uses the catalog's Chinese fields when provided, and sends the locale when resolving challenge titles. Browser display preference is separate from a saved account profile preference.

### Unavailable or pending integration

- Google and Apple sign-in, password recovery, notifications, and server-side session revocation have no implemented endpoints.
- Assessment and results, Profile, My Skills, Learning Hub, and challenge catalog/submission screens still need frontend routes and UI. Dashboard currently shows challenge progress only. Assessment history has no read endpoint.
- The existing-account guest assessment transfer endpoint is available for a future assessment flow. This frontend implements the guest upgrade on registration.
- Roadmap, Interview Simulator, Job Finder, Resume, AI Assistant, and Support remain inactive in the navigation. Dedicated roadmap and interview APIs are still pending.

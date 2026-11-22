# Career Compass — Team Roles, Tasks & Execution Plan

This document outlines the complete division of responsibilities between **Person A (Frontend & UX)** and **Person B (Backend, Database & AI)**, along with shared integration, testing, and demo tasks.

---

## 1. Shared Setup & Ground Rules (Both Team Members)
- **Repository & Git Workflow:**
  - Use a single shared GitHub repository.
  - **Never push directly to `main`.** Work on separate feature branches (e.g., `feat/frontend-ui` and `feat/backend-ai-db`) and merge via Pull Requests.
- **Shared Data Contract (`types/career.ts`):**
  - Agree on exact field names for `CareerRole`, `MarketPulse`, `TraitScores`, `QuizPayload`, `ChallengePlan`, and `SimulatorStep` before connecting Frontend and Backend.
- **Localization Architecture (`i18n`):**
  - Default language is **English (`en`)**. All UI strings must live in centralized dictionary files (`en.ts`) so Chinese (`zh`) can be added cleanly later without refactoring components.

---

## 2. Person A — Frontend, UX & Interactive Modules

### A. Core Screens & Clean Step-by-Step UX
- **View 1 — Minimalist Welcome Screen:**
  - Clean centered layout with a concise headline, 1-sentence subtitle, starting context selector (e.g., *"Exploring from scratch"* vs. *"Software/IT student looking for a niche"*), and a single **Start** button.
  - Header with language selector (`EN` active, `ZH` placeholder/ready) and navigation to saved progress.
- **View 2 — Focused Quiz Flow (One Question Per Screen):**
  - Centered single card (`max-width: 640px`) with a slim progress bar (`Step X of Y`).
  - Render 3–4 interactive multiple-choice option cards per question.
  - Implement a collapsible **"+ Add custom note"** input field so the screen stays uncluttered unless the user wants to type extra context.
  - Smooth transitions and **Back / Next** navigation controls.
- **View 3 — Scannable Results Screen:**
  - Render only after quiz completion.
  - **5-Axis Trait Radar Chart:** Visual profile across *Analytics*, *Creativity*, *People/Empathy*, *Structure*, and *Autonomy*.
  - **Recommended Career Cards:** Display match percentage, 1–2 line summary, personalized *"Why it fits your personality & hobbies"* explanation, and an **"Adjacent / Niche Pivot"** badge when relevant.
  - **Market Pulse Component:** Compact, scannable display of current demand, AI impact on the role, earning potential (Entry/Mid/Senior), and key skills (with expandable details).

### B. Retention & Engagement Modules
- **Career Versus (Side-by-Side Comparison):**
  - Allow users to select 2–3 recommended roles and open a clean comparison modal/view comparing daily work vs. routine, people interaction, stress/pace, entry barrier, earning potential, and overlapping skills.
- **7-Day Micro-Challenge Tracker:**
  - Interactive 7-day checklist (`~15–20 min/day` practical tasks) for any chosen career.
  - Allow checking off completed days and rating task enjoyment (`1–5` or thumbs up/down) to refine career affinity.
- **Day-in-the-Life Simulator:**
  - Interactive 3–4 step workplace scenario modal with multiple-choice reactions, optional custom text response, step-by-step feedback, and a final fit summary.
- **Personal Dashboard / Saved History:**
  - View past quiz results, active 7-day challenges, and update hobbies/preferences dynamically without retaking the entire quiz.

### C. Frontend Quality & Testing
- **Mock Data Layer:** Build screens against a local mock dataset first so UI progress is never blocked by backend work.
- **States & Responsiveness:** Implement loading skeletons, graceful error alerts, and mobile/desktop responsive layouts.
- **UI/UX Verification:** Test every user flow (quiz completion, custom text input, comparison, challenge check-offs, simulator steps) to ensure zero visual clutter or broken states.

---

## 3. Person B — Backend, PostgreSQL, AI & Analytics Engine

### A. Database Design & Seed Data (PostgreSQL)
- **Schema Creation (`schema.sql`):**
  - `users`: User/guest profiles and current background (e.g., *Software Engineering Student*).
  - `career_roles`: Expandable catalog of **30+ roles across 6 clusters** (*Tech & Data*, *Design & Creative*, *Business & Product*, *People & Psychology/Education*, *Science & Health/Environment*, *Communication & Law/Operations*), including `tags`, `niche_pivot_friendly`, and `market_pulse` (`JSONB`).
  - `quiz_sessions`: Stored answers, calculated `trait_scores`, and `recommended_roles`.
  - `challenge_progress`: Active 7-day tasks, completion status, and enjoyment ratings.
  - `user_activities`: Saved comparisons (`versus`) and completed simulator runs.
- **Seed Script (`seed_roles.sql`):**
  - Populate 30+ well-structured roles with accurate tags and realistic `market_pulse` data (demand, AI impact, salary tiers, key skills), making it easy to insert new roles anytime.

### B. API Endpoints & Server Logic (Node.js/Express or Python/FastAPI)
- `GET /api/roles` — Fetch active career roles with optional filtering by cluster or niche-pivot flag.
- `POST /api/quiz/evaluate` — Process selected options + custom text notes, compute `trait_scores`, match top roles, and save the session.
- `POST /api/roles/compare` — Generate structured side-by-side comparison metrics for 2–3 selected roles.
- `POST /api/challenges/start` & `PATCH /api/challenges/:id` — Generate a 7-day micro-challenge plan, persist day completion, and recalculate affinity based on user ratings.
- `POST /api/simulator/step` — Run interactive 3–4 step workplace scenarios and return realistic consequences/feedback.
- `POST /api/profile/update-signals` — Recalculate career matches when a user logs new hobbies or dislikes later.

### C. AI Integration, Scoring & Fallback Engine
- **LLM API Service (`ai.service.ts`):**
  - Configure secure server-side API calls (keeping API keys in `.env`, never exposed to the browser).
  - Enforce **Strict JSON Output** prompts for quiz evaluation, custom text analysis, challenge generation, and day simulations.
- **Tag-Scoring & Local Fallback Engine (`fallback.service.ts`):**
  - Build a deterministic tag-matching and keyword-analysis algorithm that calculates `trait_scores` and role matches locally.
  - Automatically trigger this fallback if the LLM API key is missing, rate-limited, or offline so the application never crashes.

### D. Backend Testing & Data Analysis
- **API & Schema Validation:** Test all endpoints (using Postman/Insomnia or automated tests) with valid, empty, and malformed inputs.
- **Matching & Bias Check:** Test different personas (e.g., *Software student wanting non-coding roles*, *Creative extrovert*, *Analytical introverted researcher*) to verify that recommendations, niche-pivot badges, and trait radar scores make logical sense.

---

## 4. Integration & Final Demo Checklist (Both Together)
1. **End-to-End Integration:** Replace Frontend mock services with live Backend API endpoints step by step (`Quiz -> Results + Market Pulse` first, then `Versus`, `7-Day Challenge`, and `Simulator`).
2. **Offline / Fallback Drill:** Disconnect the LLM API key and verify that the entire app still works smoothly using the local fallback engine.
3. **Final Polish & Presentation:** Prepare 2–3 realistic user personas to demonstrate the quiz, market pulse insights, role comparison, and retention features during project defense.
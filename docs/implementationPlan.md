# Raga – Phase-Wise Implementation Plan

This is the actionable execution plan derived from the [Architecture](./architecture.md) and [Problem Statement](./problemStatement.md). Each phase lists **tasks**, **files to create/modify**, **commands**, **acceptance criteria**, and a **definition of done**. Phases are sequential and each ends in a deployable increment.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres) · Google Gemini API · Vercel.

**Related docs:** [Folder Structure](./folderStructure.md) · [Edge Cases](./edgeCases.md) · [Gemini Limits](./gemini-limits.md)

---

## Conventions & Ground Rules

* **Branching:** one branch per phase — `phase-0-foundation`, `phase-1-data`, … merged to `main` after its acceptance criteria pass.
* **Validation:** all API inputs/outputs validated with **Zod**. LLM outputs parsed via Zod with one retry on failure.
* **Secrets:** `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are **server-only** — never imported into a client component.
* **Gemini quota:** All LLM calls go through `lib/gemini/generate.ts`. See [Gemini Limits](./gemini-limits.md) (5 RPM · 250k TPM · 20 RPD on `gemini-2.5-flash`).
* **Testing bar:** every API route must be independently testable via `curl`/script **before** any UI consumes it.
* **Env vars (define in `.env.local` + `.env.example`):**
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  GEMINI_API_KEY=
  GEMINI_MODEL=gemini-2.5-flash
  ```

---

## Phase 0 — Foundation & Environment Setup

**Goal:** Deployable dark-themed skeleton on Vercel with Supabase + Gemini connectivity verified.

### Tasks
1. Scaffold project:
   ```bash
   npx create-next-app@latest . --ts --tailwind --app --eslint --src-dir=false --import-alias "@/*"
   ```
2. Install dependencies:
   ```bash
   npm install @supabase/supabase-js @google/generative-ai zod zustand
   npm install -D tsx
   ```
3. Create folder structure per architecture §Phase 0.
4. Configure Tailwind design tokens (dark theme, Spotify green `#1DB954`, typography scale) in `tailwind.config.ts` and `app/globals.css`.
5. Implement clients:
   * `lib/supabase/client.ts` (browser, anon key) and `lib/supabase/admin.ts` (server, service role).
   * `lib/gemini/client.ts` (server-only Gemini wrapper).
6. Add a temporary `app/api/health/route.ts` that pings Supabase (simple `select 1`) and Gemini (tiny prompt) and returns `{ supabase: "ok", gemini: "ok" }`.
7. Build a styled placeholder Landing Page (`app/(marketing)/page.tsx`) with Raga branding.
8. Create Vercel project, connect repo, configure env vars, enable preview deployments. Add `.env.example`.

### Files
```
tailwind.config.ts, app/globals.css, app/layout.tsx
app/(marketing)/page.tsx
app/api/health/route.ts
lib/supabase/client.ts, lib/supabase/admin.ts
lib/gemini/client.ts
types/index.ts
.env.example
```

### Acceptance Criteria
- [ ] App runs locally with `npm run dev` showing the dark-theme landing page.
- [ ] `GET /api/health` returns `{ supabase: "ok", gemini: "ok" }`.
- [ ] App is live on a public Vercel URL.
- [ ] No secret keys present in the client bundle.

**Definition of Done:** Public Vercel URL renders the branded landing page; health check green.

**Edge cases:** See [Phase 0 edge cases](./edgeCases.md#phase-0--foundation--environment-setup) (P0-01–P0-10).

---

## Phase 1 — Data Layer & Sample Dataset

**Goal:** Seeded, queryable music dataset + typed data-access layer.

### Tasks
1. Author SQL migrations for all tables (`songs`, `artists`, `user_taste_profile`, `sessions`, `feedback`) per architecture §3. Store in `supabase/migrations/0001_init.sql`.
2. Add RLS policies: public read on `songs`/`artists`; writes only via service role.
3. Build dataset via MusicBrainz pipeline (see **[Phase 1 Data Sourcing Plan](./phase1-data-sourcing.md)**):
   * `data/seed-config.json` — curator anchors + genre quotas
   * `scripts/fetch-musicbrainz.ts` — fetch + derive flags → `data/*.seed.json`
   * ~**200 songs** across **12–15 genres** with derived `popularity`, `emerging_artist_flag`, `hidden_gem_flag`, `community_buzz_score`, `mood[]`, and Cover Art Archive URLs
4. Write seed script `scripts/seed.ts` (run with `npx tsx scripts/seed.ts`) using the service-role client.
5. Build typed data-access layer:
   * `lib/data/songs.ts` — `getByFilters({ genre?, mood?, hiddenGem?, emerging?, maxPopularity? })`, `getById`.
   * `lib/data/artists.ts` — `getSimilar(artistName)`, `getById`.
6. Add debug route `app/api/debug/songs/route.ts` (dev-only) returning filtered songs.

### Files
```
supabase/migrations/0001_init.sql
data/seed-config.json, data/genre-mood-map.json
data/songs.seed.json, data/artists.seed.json  (generated)
scripts/fetch-musicbrainz.ts, scripts/lib/*, scripts/schemas/seed.ts
scripts/seed.ts
lib/data/songs.ts, lib/data/artists.ts
types/index.ts (Song, Artist, TasteProfile, Feedback types)
app/api/debug/songs/route.ts
```

### Acceptance Criteria
- [ ] Migrations apply cleanly to Supabase.
- [ ] Seed script populates ~200 songs + associated artists.
- [ ] `GET /api/debug/songs?genre=indie&hiddenGem=true` returns correct filtered results.
- [ ] RLS blocks anon writes; allows anon reads.

**Definition of Done:** Database fully seeded; data-access functions return correct typed results verified via debug route.

**Edge cases:** See [Phase 1 edge cases](./edgeCases.md#phase-1--data-layer--sample-dataset) (P1-01–P1-12).

---

## Phase 2 — Intent Extraction (AI Discovery Companion NLU)

**Goal:** `/api/intent` turns natural language into a validated `DiscoveryIntent`.

### Tasks
1. Define `DiscoveryIntent` type + Zod schema in `lib/intent/schema.ts`:
   ```ts
   { mood?: string[]; activity?: string; genre?: string[]; seedArtist?: string;
     intent: "similar_to"|"mood_based"|"activity_based"|"trending"|"general_discovery";
     explorationLevel: "conservative"|"balanced"|"adventurous"; }
   ```
2. Write the extraction prompt in `lib/intent/prompt.ts` using Gemini JSON/structured output mode.
3. Implement `app/api/intent/route.ts`: accepts `{ message, history? }` → Gemini → Zod-validate → retry once on malformed JSON → return `DiscoveryIntent`.
4. Ambiguity handling: low-signal input → `general_discovery` + a `clarifyingQuestion` field for the chat to surface.
5. Persist each turn (`message`, extracted `intent`) to `sessions.messages`.
6. Test harness `scripts/test-intent.ts` running all example prompts from the problem statement.

### Files
```
lib/intent/schema.ts, lib/intent/prompt.ts
app/api/intent/route.ts
lib/data/sessions.ts
scripts/test-intent.ts
```

### Acceptance Criteria
- [ ] All 5 example prompts from the problem statement produce sensible structured intent.
- [ ] Malformed LLM output is retried and never crashes the route.
- [ ] Ambiguous input returns `general_discovery` + clarifying question.
- [ ] Turns persisted to `sessions`.

**Definition of Done:** `scripts/test-intent.ts` passes for all example prompts.

**Edge cases:** See [Phase 2 edge cases](./edgeCases.md#phase-2--intent-extraction) (P2-01–P2-14).

---

## Phase 3 — Recommendation Engine (70/30 Scoring)

**Goal:** Deterministic, explainable scoring engine + `/api/recommend`.

### Tasks
1. Implement scoring in `lib/scoring/recommend.ts`:
   * `personalScore` (70%): genre/mood/artist match vs. intent + `user_taste_profile`.
   * `culturalScore` (30%): `hidden_gem_flag`, `emerging_artist_flag`, `community_buzz_score`, inverse `popularity`, scaled by `explorationLevel`.
   * `finalScore = w_p*personalScore + w_c*culturalScore` where weights default to 0.7/0.3 and shift with `explorationLevel` (config in `lib/scoring/config.ts`, **not** hardcoded).
2. Candidate generation: SQL filter (genre/mood/similar-artist, array overlap) → in-memory rank → top N (6–8).
3. Implement `app/api/recommend/route.ts`: `{ intent, sessionId }` → `RecommendationCandidate[]` with full score breakdown + `matchedSignals`.
4. Unit tests for scoring edge cases (no matches, adventurous vs conservative, empty profile).
5. Test script `scripts/test-recommend.ts`.

### Files
```
lib/scoring/recommend.ts, lib/scoring/config.ts
app/api/recommend/route.ts
lib/data/profile.ts
scripts/test-recommend.ts
types/index.ts (RecommendationCandidate)
```

### Acceptance Criteria
- [ ] Given an intent, returns 6–8 ranked candidates with `personalScore`, `culturalScore`, `finalScore`, `matchedSignals`.
- [ ] `explorationLevel: "adventurous"` measurably surfaces more hidden-gem/emerging tracks than `"conservative"`.
- [ ] Deterministic: same intent + profile → same ranking.
- [ ] Weights are read from config, not hardcoded in logic.

**Definition of Done:** `scripts/test-recommend.ts` produces explainable, deterministic, tunable rankings.

**Edge cases:** See [Phase 3 edge cases](./edgeCases.md#phase-3--recommendation-engine) (P3-01–P3-14).

---

## Phase 4 — Explanation & Narrative Generation

**Goal:** `/api/explain` converts scored candidates into grounded, human-facing copy + chat replies.

### Tasks
1. Define `RecommendationExplanation` type + Zod schema.
2. Write a **batched, grounded** Gemini prompt in `lib/explain/prompt.ts` — feed only actual matched signals; instruct model to explain using only that data (no invented facts about real artists).
3. Implement `app/api/explain/route.ts`: batch of candidates + intent → one Gemini call → per-song `whyYoullLikeIt`, `whyInteresting`, `discoverySource`, `explorationPath`.
4. Add conversational reply generation (concise, references extracted intent).
5. Create orchestrator `app/api/chat/route.ts` (or server action) chaining intent → recommend → explain into a single UI-facing response.

### Files
```
lib/explain/schema.ts, lib/explain/prompt.ts
app/api/explain/route.ts
app/api/chat/route.ts
scripts/test-chat.ts
```

### Acceptance Criteria
- [ ] `POST /api/chat` with raw text returns chat reply + narrated recommendation cards end-to-end.
- [ ] Explanations reference only real matched signals (spot-check: no hallucinated artist facts).
- [ ] Single batched Gemini call per explanation request (cost control verified).

**Definition of Done:** Full raw-text → narrated-cards pipeline works via `curl`, no UI required.

**Edge cases:** See [Phase 4 edge cases](./edgeCases.md#phase-4--explanation--narrative-generation) (P4-01–P4-12).

---

## Phase 5 — Frontend Experience (Screens 1–4)

**Goal:** Premium, Spotify-inspired, mobile-first UI wired to live APIs.

### Tasks
1. Build shared UI primitives in `components/ui/`: `Card`, `Button`, `Badge` (`Hidden Gem`, `Emerging Artist`), `ChatBubble`, `Skeleton`.
2. **Screen 1 – Landing** (`app/(marketing)/page.tsx`): hero + search box + suggested prompt chips (from example prompts) → routes into chat.
3. **Screen 2 – Chat** (`app/chat/page.tsx`): ChatGPT-style UI, streaming reply, calls `/api/chat`, renders cards inline.
4. **Screen 3 – Results** (`components/RecommendationGrid.tsx`): responsive card grid (album art, artist, song, explanation snippet).
5. **Screen 4 – Detail** (`app/results/[songId]/page.tsx`): full rationale, discovery source, similar artists, exploration path.
6. Client state via Zustand (`lib/store/session.ts`); persist `session_id` in cookie/localStorage.

### Files
```
components/ui/*, components/RecommendationCard.tsx, components/RecommendationGrid.tsx, components/ChatWindow.tsx
app/(marketing)/page.tsx, app/chat/page.tsx, app/results/[songId]/page.tsx
lib/store/session.ts
```

### Acceptance Criteria
- [ ] All four screens render and navigate correctly on mobile + desktop.
- [ ] Chat produces live recommendation cards from real API responses (no mock data).
- [ ] Detail view deep-links via `/results/[songId]`.
- [ ] UI matches premium dark + Spotify-green aesthetic.

**Definition of Done:** Navigable, responsive, polished Screens 1–4 wired to live APIs on Vercel preview.

**Edge cases:** See [Phase 5 edge cases](./edgeCases.md#phase-5--frontend-experience) (P5-01–P5-14).

---

## Phase 6 — Feedback Loop & Personalization (Screen 5)

**Goal:** Feedback actively reshapes subsequent recommendations.

### Tasks
1. **Screen 5 – Feedback:** inline `Love It` / `Skip` / `More Like This` actions on cards + detail view.
2. Implement `app/api/feedback/route.ts`: record in `feedback` table, then update `user_taste_profile`:
   * `love` → reinforce genre/artist/mood weights (+), nudge `explorationLevel`.
   * `skip` → decay those weights.
   * `more_like_this` → trigger a follow-up `/api/recommend` biased to that song's profile, surfaced as a new chat turn.
3. Update `/api/recommend` to read `user_taste_profile` at query time.
4. Add lightweight analytics logging (love/skip/more counts per session) for the case-study narrative.

### Files
```
app/api/feedback/route.ts
lib/data/feedback.ts, lib/data/profile.ts (update rules)
components/FeedbackControls.tsx
```

### Acceptance Criteria
- [ ] Feedback actions persist to `feedback` and update `user_taste_profile`.
- [ ] `More Like This` returns a new, visibly related set of recommendations.
- [ ] Recommendations demonstrably shift within a session after several `love`/`skip` actions.

**Definition of Done:** Feedback measurably changes subsequent recommendations — the core MVP proof point.

**Edge cases:** See [Phase 6 edge cases](./edgeCases.md#phase-6--feedback-loop--personalization) (P6-01–P6-12).

---

## Phase 7 — Polish, Hardening & Deployment

**Goal:** Production-quality, publicly deployed, demo-ready MVP.

### Tasks
1. UX polish: loading/skeleton, empty, and error states (Gemini timeout → graceful fallback); card-reveal + feedback micro-interactions (Framer Motion).
2. Accessibility: contrast check on dark theme, keyboard nav, ARIA labels on chat.
3. Performance: stream chat replies, cache repeated intents, `next/image` for album art.
4. Guardrails: input validation/sanitization, API-route rate limiting (`lib/rate-limit.ts`), Gemini quota enforcement (`lib/gemini/generate.ts`), prompt-injection mitigation (system instructions constraining output).
5. Secrets audit: confirm service-role + Gemini keys are server-only.
6. Final Vercel production deploy; smoke-test full user journey on public URL.
7. Write `README.md` (setup, architecture summary, demo script).

### Files
```
components/ (loading/error/empty states), lib/rate-limit.ts
README.md
```

### Acceptance Criteria
- [ ] All "Expected Deliverables" from the problem statement demonstrable end-to-end.
- [ ] Graceful handling of API/LLM failures.
- [ ] No secrets in client bundle; rate limiting active.
- [ ] Public production URL passes full-journey smoke test.

**Definition of Done:** Public, hardened, demo-ready Raga MVP + README.

**Edge cases:** See [Phase 7 edge cases](./edgeCases.md#phase-7--polish-hardening--deployment) (P7-01–P7-12).

---

## Milestone / Sequencing Summary

| Phase | Branch | Depends On | Demoable Increment |
|---|---|---|---|
| 0 | `phase-0-foundation` | — | Live branded skeleton + health check |
| 1 | `phase-1-data` | 0 | Seeded DB + query layer |
| 2 | `phase-2-intent` | 1 | Text → structured intent |
| 3 | `phase-3-recommend` | 1, 2 | Intent → scored recommendations |
| 4 | `phase-4-explain` | 3 | Recommendations → narrated cards (API) |
| 5 | `phase-5-frontend` | 4 | Screens 1–4 wired to live APIs |
| 6 | `phase-6-feedback` | 5 | Feedback loop reshaping results |
| 7 | `phase-7-polish` | 6 | Hardened public MVP |

## Critical Path & Parallelization Notes
* **Critical path:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7.
* **Parallelizable:** UI primitives/design system (part of Phase 5) can begin during Phases 2–4 using mock data; the sample dataset curation (Phase 1) can be prepared during Phase 0.
* **Risk buffers:** Gemini prompt reliability (Phases 2 & 4) is the highest-uncertainty work — timebox prompt iteration and keep deterministic fallbacks so the demo never fully depends on a single LLM call succeeding.

## Cross-Cutting Definition of Done (every phase)
- [ ] Typecheck (`tsc`) + lint pass.
- [ ] New API routes validated with Zod and tested via script/`curl`.
- [ ] No secrets leaked to client bundle.
- [ ] Branch deploys cleanly to a Vercel preview.

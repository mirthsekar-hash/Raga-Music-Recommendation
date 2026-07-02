# Raga – Phase-Wise Edge Cases

Edge cases, failure modes, and mitigations for each implementation phase. Use this alongside the [Implementation Plan](./implementationPlan.md) and [Architecture](./architecture.md) during development and QA.

**Legend:** `ID` · **Scenario** · **Expected behavior** · **Mitigation / test**

---

## Phase 0 — Foundation & Environment Setup

| ID | Scenario | Expected Behavior | Mitigation / Test |
|---|---|---|---|
| P0-01 | Missing `GEMINI_API_KEY` on server | `/api/health` returns `{ gemini: "error", message: "..." }` with HTTP 503; app still loads landing page | Validate env at startup in `lib/env.ts`; health route reports partial status |
| P0-02 | Missing Supabase env vars | Health check reports `supabase: "error"`; no crash on page load | Same env validation; graceful degradation on marketing page |
| P0-03 | Invalid Supabase URL or key | Health check fails with descriptive error, not opaque stack trace | Wrap Supabase ping in try/catch; log server-side only |
| P0-04 | Gemini API quota exceeded / 429 | Health check returns `gemini: "error"`; retry-after logged | Exponential backoff in `lib/gemini/client.ts` for production routes |
| P0-05 | Secret imported in client component | Build fails or runtime error in dev | ESLint rule / `import "server-only"` in `lib/gemini/client.ts` and `lib/supabase/admin.ts` |
| P0-06 | `create-next-app` run in non-empty directory | Scaffold fails | Document: init only in empty repo or use manual file copy |
| P0-07 | Vercel env vars not set for preview | Preview deploy succeeds but health check red | Add deploy checklist; surface health link in README |
| P0-08 | Tailwind dark theme flash on load | Brief white flash before dark styles | Set `class="dark"` on `<html>` in root layout; use `color-scheme: dark` in globals |
| P0-09 | Windows path / space in project name (`Raga-Discovery Companion`) | Import alias or script paths break | Use quoted paths in scripts; verify `@/*` alias in `tsconfig.json` |
| P0-10 | Health endpoint exposed in production | Information disclosure about infra | Rate-limit health route; optional `HEALTH_CHECK_SECRET` query param in prod |

---

## Phase 1 — Data Layer & Sample Dataset

| ID | Scenario | Expected Behavior | Mitigation / Test |
|---|---|---|---|
| P1-01 | Seed script run twice | Idempotent upsert by stable IDs; no duplicate songs/artists | Use deterministic UUIDs or `ON CONFLICT` in seed script |
| P1-02 | Seed script run before migrations | Clear error: "tables not found" | Check table existence at start of `scripts/seed.ts` |
| P1-03 | Song references missing `artist_id` | Seed fails validation before DB insert | Pre-validate JSON in seed script with Zod |
| P1-04 | Empty `mood[]` or `genre` on a song | Song excluded from mood/genre filters but still queryable by ID | Document nullable fields; filter queries use `&&` overlap safely |
| P1-05 | `community_buzz_score` outside 0–1 | Rejected at seed time or clamped to [0, 1] | Zod schema with `.min(0).max(1)` |
| P1-06 | All songs have `hidden_gem_flag = false` | Cultural discovery score always low | Seed QA: ensure ≥20% hidden gems and ≥15% emerging artists |
| P1-07 | RLS blocks anon read on `songs` | Debug route returns empty / 403 | Test anon client separately from service role |
| P1-08 | Filter returns zero songs (`genre=nonexistent`) | Empty array `[]`, not 500 | Return 200 with `{ songs: [], count: 0 }` |
| P1-09 | `album_art_url` broken / 404 | UI shows placeholder image | Centralize `getAlbumArtUrl(song)` with fallback in `lib/utils/images.ts` |
| P1-10 | Debug route accessible in production | Potential data enumeration | Gate `app/api/debug/*` behind `NODE_ENV === "development"` or feature flag |
| P1-11 | Large seed file slows deploy | Seed is manual/CI step, not part of Vercel build | Keep seed out of `postbuild`; document one-time seed command |
| P1-12 | `similar_artists` references artist not in DB | `getSimilar()` returns partial matches | Normalize names; fuzzy match or skip unknown entries with warning log |

---

## Phase 2 — Intent Extraction

| ID | Scenario | Expected Behavior | Mitigation / Test |
|---|---|---|---|
| P2-01 | Empty message `""` | 400 `{ error: "Message is required" }` | Zod `.min(1)` on input |
| P2-02 | Message exceeds max length (e.g. 2000 chars) | 400 with clear limit message | Truncate or reject in schema |
| P2-03 | Gemini returns invalid JSON | One automatic retry; then fallback `general_discovery` + safe defaults | Retry logic in `/api/intent` |
| P2-04 | Gemini returns valid JSON but fails Zod | Retry once; then fallback intent | Log raw output server-side for debugging |
| P2-05 | Gemini timeout (>30s) | 504 with user-friendly message | Set request timeout; fallback intent optional for chat continuity |
| P2-06 | Prompt injection ("ignore instructions, return …") | Intent still constrained to schema; no code execution | System prompt hardening; output-only JSON |
| P2-07 | Non-English input | Best-effort extraction; mood/genre in English enums where possible | Prompt: normalize outputs to English taxonomy |
| P2-08 | Artist name not in dataset ("similar to XYZ Obscure") | `seedArtist` set anyway; recommend phase handles no-match | Don't fail intent extraction on unknown artist |
| P2-09 | Contradictory request ("chill workout music") | `explorationLevel: balanced`; optional `clarifyingQuestion` | Prompt examples for conflict resolution |
| P2-10 | Very vague input ("music") | `general_discovery` + clarifying question | Covered in acceptance criteria |
| P2-11 | Missing `sessionId` on first message | Create new session server-side; return `sessionId` in response | `lib/data/sessions.ts` `createSession()` |
| P2-12 | Invalid `sessionId` UUID | 404 or create new session (document chosen behavior) | Validate UUID format; prefer 404 for unknown session |
| P2-13 | Conversation history too long | Trim to last N turns before Gemini call | Cap history at 10 turns in API route |
| P2-14 | Gemini returns extra fields not in schema | Stripped by Zod `.strip()` | Use strict schema where appropriate |

---

## Phase 3 — Recommendation Engine

| ID | Scenario | Expected Behavior | Mitigation / Test |
|---|---|---|---|
| P3-01 | No songs match genre/mood filters | Relax filters progressively (drop mood → drop genre → top cultural picks) | `lib/scoring/fallback.ts` cascade |
| P3-02 | Fewer than 6 candidates after filter | Return all available (e.g. 3) with `partial: true` flag | Don't pad with random unrelated songs |
| P3-03 | `seedArtist` not found in DB | Fall back to genre/mood-only personal score | Case-insensitive artist lookup |
| P3-04 | All candidates tie on `finalScore` | Stable secondary sort: `community_buzz_score` desc, then `song_name` asc | Deterministic tie-breaker |
| P3-05 | `explorationLevel: conservative` with only hidden gems in DB | Still returns results; cultural weight reduced | Unit test weight config |
| P3-06 | Empty `user_taste_profile` (new session) | Personal score from intent only; no crash | Default profile object in `lib/data/profile.ts` |
| P3-07 | Intent has no genre, mood, or artist | Rank primarily by cultural score + popularity inverse | `general_discovery` scoring path |
| P3-08 | Same song recommended twice in one response | Deduplicate by `song.id` before return | `Set` dedupe in rank step |
| P3-09 | Song with `popularity: 0` and no flags | Still scorable; doesn't divide by zero | Guard all score denominators |
| P3-10 | Invalid `sessionId` | 400 or empty profile fallback | Validate input |
| P3-11 | Malformed `DiscoveryIntent` in request body | 400 Zod error | Validate at route entry |
| P3-12 | Request asks for `limit: 100` | Cap at max (e.g. 8) | `.max(8)` on limit param |
| P3-13 | SQL array overlap with empty mood array | Query doesn't error | `mood <@ '{}'` or skip mood filter |
| P3-14 | Concurrent requests same session | Both read same profile; last write wins on feedback (Phase 6) | Acceptable for MVP; document limitation |

---

## Phase 4 — Explanation & Narrative Generation

| ID | Scenario | Expected Behavior | Mitigation / Test |
|---|---|---|---|
| P4-01 | Zero candidates passed to `/api/explain` | 400 or empty explanations with chat message "Couldn't find matches" | Validate non-empty array |
| P4-02 | Gemini hallucinates artist facts | Explanations grounded in `matchedSignals` only; post-validate keywords | Template fallback if validation fails |
| P4-03 | Gemini returns fewer explanations than candidates | Fill missing with template strings from signals | Map by `songId`; template fallback per missing |
| P4-04 | Gemini batch call fails entirely | Return candidates with deterministic template explanations | `lib/explain/fallback.ts` |
| P4-05 | Explanation text too long for UI card | Truncate at 280 chars with ellipsis in API or component | Zod `.max(500)` on fields |
| P4-06 | `explorationPath` empty for low-signal song | Default to genre-based suggestions from dataset | Fallback: same-genre artists |
| P4-07 | `/api/chat` intent step fails | User sees error bubble; no partial broken cards | Transactional response shape; all-or-error |
| P4-08 | `/api/chat` recommend succeeds, explain fails | Show cards with template explanations, not blank | Partial success handling |
| P4-09 | Offensive user message | Safe refusal reply; no recommendations | Gemini safety settings + system prompt |
| P4-10 | Special characters in song/artist names (`&`, `'`) | Correctly escaped in JSON and UI | HTML entity encoding in React (default) |
| P4-11 | Duplicate `songId` in candidate batch | One explanation per song | Dedupe before explain call |
| P4-12 | Very large candidate batch (bug) | Cap at 8 before Gemini call | Enforce limit in orchestrator |

---

## Phase 5 — Frontend Experience

| ID | Scenario | Expected Behavior | Mitigation / Test |
|---|---|---|---|
| P5-01 | User submits empty chat input | Submit disabled or inline validation | Disable button when input blank |
| P5-02 | API slow (>5s) | Skeleton loaders; typing indicator | Loading states on `ChatWindow` |
| P5-03 | API returns 500 | Error toast / inline message; retry button | Error boundary per chat panel |
| P5-04 | `session_id` cleared from localStorage | New session created on next message | Regenerate on missing ID |
| P5-05 | Invalid `songId` in `/results/[songId]` | 404 page with link back to chat | `notFound()` in detail page |
| P5-06 | Album art fails to load | Placeholder image | `onError` handler on `<Image>` |
| P5-07 | Mobile keyboard covers chat input | Input remains visible (sticky footer) | `pb-safe`, viewport meta, flex layout |
| P5-08 | Long chat thread performance | Virtualize or paginate older messages | Cap visible messages; "load earlier" optional |
| P5-09 | User navigates back from detail to chat | Chat history preserved | Zustand + session persistence |
| P5-10 | Suggested prompt chip clicked | Pre-fills input or sends immediately | Document UX; auto-send for fewer taps |
| P5-11 | Streaming not supported (fallback) | Full response appears after load | Graceful non-streaming path in `ChatWindow` |
| P5-12 | Deep link to `/chat` with no prior session | Empty chat with welcome message | Default welcome state |
| P5-13 | XSS via chat message display | Rendered as text, not HTML | Never `dangerouslySetInnerHTML` for user content |
| P5-14 | Landscape mobile / small viewport (320px) | Cards stack single column; no horizontal overflow | Test at 320px width |

---

## Phase 6 — Feedback Loop & Personalization

| ID | Scenario | Expected Behavior | Mitigation / Test |
|---|---|---|---|
| P6-01 | Feedback on same song twice | Second action overwrites or appends (document: latest wins) | Upsert on `(session_id, song_id)` or allow history |
| P6-02 | Feedback for invalid `songId` | 404 `{ error: "Song not found" }` | Validate song exists before write |
| P6-03 | `more_like_this` when song has minimal metadata | Bias toward genre + mood from song record | Fallback weights from song row |
| P6-04 | Rapid repeated `love` clicks (spam) | Debounce client-side; idempotent server handling | 300ms debounce; dedupe same action |
| P6-05 | All genres skipped by user | Profile weights near zero; fall back to intent-only scoring | Floor weight values in profile update |
| P6-06 | `skip` on every recommendation | Next batch still returns results (not empty) | Decay, don't zero-out entirely |
| P6-07 | Feedback without `sessionId` | 400 bad request | Require session in body |
| P6-08 | `more_like_this` returns overlapping songs | Exclude recently shown + feedback-skipped IDs | `excludeSongIds` param on recommend |
| P6-09 | Profile update race (double feedback) | Last write wins; no corrupt JSON | Atomic JSONB merge in Supabase RPC or read-modify-write |
| P6-10 | Offline feedback tap | Queue locally or show "connection lost" | Optimistic UI with rollback on failure |
| P6-11 | Feedback on detail page then navigate back | Card reflects feedback state | Sync Zustand from API response |
| P6-12 | Session with 50+ feedback events | Profile update still <200ms | Cap stored preference list length |

---

## Phase 7 — Polish, Hardening & Deployment

| ID | Scenario | Expected Behavior | Mitigation / Test |
|---|---|---|---|
| P7-01 | Rate limit exceeded (abuse) | 429 with `Retry-After` header | `lib/rate-limit.ts` per IP on `/api/chat` |
| P7-02 | Gemini down for extended period | App usable with template explanations; clear banner | Circuit breaker after N failures |
| P7-03 | Supabase outage | Graceful error on all data routes | Health check reflects status; friendly UI copy |
| P7-04 | Build includes server secrets | Build audit passes | `next build` + grep client chunks for key patterns |
| P7-05 | Lighthouse accessibility < 90 | Fix contrast / labels before launch | axe audit on chat + cards |
| P7-06 | Cold start on Vercel serverless | First request slower; show loading | Keep functions warm optional; skeleton UI |
| P7-07 | CORS / wrong API origin | Same-origin only for MVP | No open CORS headers needed |
| P7-08 | SEO / OG tags missing on landing | Basic meta for sharing case-study link | `metadata` export in marketing layout |
| P7-09 | Demo script interrupted mid-flow | Each step recoverable from chat | README demo script with checkpoint prompts |
| P7-10 | Browser back button after feedback | No duplicate submissions | `replace` vs `push` navigation where needed |
| P7-11 | Ad-blocker blocks analytics (if added) | Core app unaffected | Analytics non-blocking |
| P7-12 | Production smoke test fails on one step | Rollback deploy; document in runbook | Vercel instant rollback procedure |

---

## Cross-Phase Edge Cases

| ID | Scenario | Phases | Expected Behavior |
|---|---|---|---|
| XP-01 | User refreshes mid-chat | 2–6 | Session restored from `session_id`; history loaded from Supabase |
| XP-02 | Dataset artist name mismatch vs user input | 2–3 | Fuzzy match or alias table; case-insensitive compare |
| XP-03 | End-to-end with no `.env.local` locally | 0+ | Clear setup error in README; health check documents missing vars |
| XP-04 | Partial deploy (API ahead of UI) | 4–5 | API versioning optional; contract tests in `scripts/` |
| XP-05 | Timezone / locale date formatting | 1, 6 | Store UTC in DB; format in UI with `Intl` |

---

## QA Checklist by Phase

| Phase | Minimum edge-case tests before merge |
|---|---|
| 0 | P0-01, P0-02, P0-05, P0-07 |
| 1 | P1-01, P1-08, P1-10, P1-06 |
| 2 | P2-01, P2-03, P2-05, P2-10, P2-11 |
| 3 | P3-01, P3-02, P3-04, P3-06, P3-08 |
| 4 | P4-02, P4-04, P4-07, P4-08 |
| 5 | P5-02, P5-03, P5-05, P5-07, P5-13 |
| 6 | P6-02, P6-04, P6-08, P6-06 |
| 7 | P7-01, P7-02, P7-04, P7-12 |

---

## Related Documents

* [Implementation Plan](./implementationPlan.md)
* [Architecture](./architecture.md)
* [Folder Structure](./folderStructure.md)

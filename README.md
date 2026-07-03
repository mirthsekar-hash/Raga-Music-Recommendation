# Raga – AI Discovery Companion

AI-powered music discovery combining conversational recommendations with cultural discovery signals (hidden gems, emerging artists, community buzz).

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Next.js API routes (serverless on Vercel) |
| Database | Supabase (PostgreSQL) |
| LLM | Google Gemini (`gemini-2.5-flash`) |

## Architecture (summary)

```
User → Chat UI → POST /api/chat/stream
                    ├─ extract intent (Gemini + heuristic fallback)
                    ├─ score & rank songs (deterministic engine)
                    ├─ generate explanations (Gemini + template fallback)
                    └─ persist session + taste profile (Supabase)

Feedback (Love / Skip / More like this) → POST /api/feedback
                    ├─ record feedback row
                    ├─ update user_taste_profile
                    └─ optional follow-up recommendations
```

All Gemini and Supabase service-role access stays **server-only** (`lib/gemini/*`, `lib/supabase/admin.ts`, `lib/data/*`).

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Service role key |
| `GEMINI_API_KEY` | **Server only** | Google AI Studio key |
| `GEMINI_MODEL` | Server | Default: `gemini-2.5-flash` |
| `HEALTH_CHECK_SECRET` | Optional | Protects `/api/health` in production |

See [docs/gemini-limits.md](./docs/gemini-limits.md) for free-tier RPM/RPD budgets.

### 3. Database

Run migrations in the [Supabase SQL Editor](https://supabase.com/dashboard):

- `supabase/migrations/0001_init.sql`
- `supabase/migrations/0002_gemini_usage.sql`

Seed the catalog:

```bash
npm run fetch:seed:fast   # MusicBrainz data (~10–15 min)
npm run seed
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API routes

| Route | Purpose |
|---|---|
| `GET /api/health` | Supabase + Gemini connectivity |
| `POST /api/chat` | Full chat orchestration (JSON) |
| `POST /api/chat/stream` | Same flow with NDJSON status events |
| `POST /api/intent` | Intent extraction only |
| `POST /api/recommend` | Scored recommendations |
| `POST /api/explain` | Card explanations |
| `POST /api/feedback` | Love / skip / more-like-this |

All mutation routes use Zod validation, per-IP rate limiting (`lib/rate-limit.ts`), and Gemini quota enforcement (`lib/gemini/quota.ts`).

## Test scripts

```bash
npm run test:intent
npm run test:scoring
npm run test:recommend
npm run test:chat
npm run test:feedback
npm run build && npm run audit:secrets
npm run smoke:test          # after deploy or with local dev server
```

## Evals (golden-set regression)

Offline evals use fixed fixtures in `evals/fixtures/` — no Gemini quota, safe for CI:

```bash
npm run eval                # relevance + intent heuristic + explain grounding
npm run eval:relevance      # off-topic vs music-discovery guardrails
npm run eval:intent         # heuristic intent against golden prompts
npm run eval:explain        # template explanations cite song/artist only
npm run eval:intent -- --live   # also score POST /api/intent (uses Gemini)
```

Golden cases live in `evals/fixtures/intent-golden.json` and `relevance-golden.json`. Add new rows when you fix edge cases or change prompts.

PowerShell example:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
```

## Deploy to Vercel

1. Push the repo to GitHub.
2. [Import the project](https://vercel.com/new) in Vercel (framework preset: **Next.js**).
3. Add environment variables from `.env.example` in the Vercel dashboard (**Production** + **Preview**).
4. Deploy.

### Vercel notes

- **Serverless timeouts:** Chat/feedback/explain routes set `maxDuration = 60` (requires Vercel Pro for >10s; Hobby may truncate long Gemini calls).
- **Cold starts:** First request after idle can be slower — the UI shows skeleton/status states.
- **Rate limiting:** In-memory per-IP limits work per serverless instance; sufficient for MVP demos.
- **Images:** Album art uses `next/image` with remote patterns configured in `next.config.ts`.
- **Security headers:** `vercel.json` adds `X-Frame-Options`, `nosniff`, etc.
- **Debug routes:** `/api/debug/*` returns 404 in production.

### Post-deploy smoke test

```bash
TEST_BASE_URL=https://your-app.vercel.app npm run smoke:test
```

## Demo script (case study)

1. **Home** — Tap “Give me hidden gems similar to Coldplay” or open Chat.
2. **Chat** — Ask *“Underrated indie for a late-night drive”*; watch status updates while Raga finds picks.
3. **Cards** — Scroll horizontal recommendations; tap **♥ Love** or **More** on a track.
4. **Results** — Open “View all results”; skipped tracks disappear from the list.
5. **Detail** — Open a song; read “Why you’ll like it” / “Why it’s interesting”.
6. **Feedback** — Submit Screen 5 form; confirm taste profile updates.
7. **Follow-up** — Use **More like this**; new related cards appear in chat.

**Checkpoint:** If Gemini quota is exhausted, the app still returns recommendations with template explanations and shows a degraded-service banner.

## Project status

| Phase | Status |
|---|---|
| 0 Foundation | ✅ |
| 1 Data layer | ✅ |
| 2 Intent extraction | ✅ |
| 3 Recommendation engine | ✅ |
| 4 Explain + chat API | ✅ |
| 5 Spotify-inspired UI | ✅ |
| 6 Feedback loop | ✅ |
| 7 Polish & deployment | ✅ |

## Documentation

- [Problem Statement](./docs/problemStatement.md)
- [Architecture](./docs/architecture.md)
- [Implementation Plan](./docs/implementationPlan.md)
- [Edge Cases](./docs/edgeCases.md)
- [Evals](./docs/evals.md)

## License

Private MVP — MusicBrainz seed data used under [CC0](https://musicbrainz.org/doc/Licensing).

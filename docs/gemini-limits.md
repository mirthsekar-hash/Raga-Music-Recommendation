# Gemini API — Free Tier Limits & MVP Budget

Raga is built against the **Google Gemini free tier**. All LLM routes must go through `lib/gemini/generate.ts` (`generateWithQuota`) so RPM, TPM, and RPD limits are enforced.

**Default model:** `gemini-2.5-flash` (set via `GEMINI_MODEL`). Some projects show **0 quota** for `gemini-2.0-flash` / `gemini-2.0-flash-lite` — use the model that has non-zero limits in [AI Studio → Rate limits](https://aistudio.google.com/).

## Free Tier Limits (`gemini-2.5-flash`)

Limits vary by account; values below match a typical AI Studio free project. Confirm yours in AI Studio.

| Metric | Limit |
|---|---|
| Maximum context window | 1,048,576 tokens (~1M per request) |
| Requests per minute (RPM) | **5** |
| Tokens per minute (TPM) | **250,000** |
| Requests per day (RPD) | **20** |

## MVP Call Budget

Designed so a single discovery session stays well within limits:

| User action | Gemini calls | Notes |
|---|---|---|
| `/api/health` | 1 | Tiny prompt; avoid polling in production |
| `/api/intent` (Phase 2) | 1 (+1 retry on bad JSON) | `maxOutputTokens: 512` |
| `/api/explain` (Phase 4) | 1 batched | All cards in **one** call; `maxOutputTokens: 2048` |
| `/api/chat` (Phase 4) | **2 total** | intent → recommend → explain (orchestrated) |

**Daily demo capacity:** ~**10 full chat sessions/day** (20 RPD ÷ 2 calls/session), plus a small buffer for health checks and dev testing.

## Enforcement (code)

| Layer | File | What it does |
|---|---|---|
| Config | `lib/gemini/config.ts` | Limit constants + MVP budgets |
| Quota | `lib/gemini/quota.ts` | RPM/TPM in-memory window + RPD via `gemini_usage` table |
| Generate | `lib/gemini/generate.ts` | **Only** entry point for Gemini calls |
| IP limit | `lib/rate-limit.ts` | 4 chat requests/min/IP (Phase 4+) |
| DB | `supabase/migrations/0002_gemini_usage.sql` | Persistent daily request counter |

## Design Rules (all phases)

1. **Never** call Gemini from client components.
2. **Batch** explanations — one call per recommendation set, not per song.
3. **Cap** conversation history sent to Gemini (last **10** turns).
4. **Truncate** inputs via `maxInputChars` in config.
5. **Retry** malformed JSON **once** only (`maxJsonRetries: 1`).
6. **Fallback** to template explanations when quota exceeded (Phase 4).
7. **Do not** stream until quota logic is verified (Phase 7).

## Token Estimates (per chat turn)

| Component | Est. tokens |
|---|---|
| Intent extraction | ~700 |
| Batched explain (8 songs) | ~3,300 |
| **Total per turn** | ~4,000 |

Well under **250k TPM** and **1M context**.

## Apply migration

Run `supabase/migrations/0002_gemini_usage.sql` in Supabase SQL Editor (if not already applied).

## Monitoring

```sql
SELECT * FROM gemini_usage ORDER BY usage_date DESC LIMIT 7;
```

## Related

- [Architecture](./architecture.md)
- [Implementation Plan](./implementationPlan.md)
- [Edge Cases](./edgeCases.md) — P0-04, P4-*, P7-01

# Raga – Project Folder Structure

Canonical directory layout for the Raga MVP. Folders are created up front; implementation files are added phase by phase per the [Implementation Plan](./implementationPlan.md).

```
Raga-Discovery Companion/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Public marketing routes (no app chrome)
│   │   └── page.tsx              # Screen 1: Landing Page
│   ├── chat/
│   │   └── page.tsx              # Screen 2: AI Discovery Chat
│   ├── results/
│   │   ├── page.tsx              # Screen 3: Recommendation Results (optional aggregate view)
│   │   └── [songId]/
│   │       └── page.tsx          # Screen 4: Recommendation Detail
│   ├── api/
│   │   ├── health/
│   │   │   └── route.ts          # Phase 0: connectivity smoke test
│   │   ├── intent/
│   │   │   └── route.ts          # Phase 2: NLU / intent extraction
│   │   ├── recommend/
│   │   │   └── route.ts          # Phase 3: scoring engine
│   │   ├── explain/
│   │   │   └── route.ts          # Phase 4: narrative generation
│   │   ├── chat/
│   │   │   └── route.ts          # Phase 4: orchestrator (intent → recommend → explain)
│   │   ├── feedback/
│   │   │   └── route.ts          # Phase 6: Love / Skip / More Like This
│   │   ├── profile/
│   │   │   └── route.ts          # Phase 3/6: taste profile read/update
│   │   └── debug/
│   │       └── songs/
│   │           └── route.ts      # Phase 1: dev-only dataset queries
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── ui/                       # Primitives: Button, Card, Badge, Skeleton, ChatBubble
│   ├── ChatWindow.tsx            # Phase 5: conversational UI shell
│   ├── RecommendationCard.tsx    # Phase 5: single recommendation card
│   ├── RecommendationGrid.tsx    # Phase 5: results grid
│   └── FeedbackControls.tsx      # Phase 6: Love / Skip / More Like This
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client (anon key)
│   │   └── admin.ts              # Server client (service role)
│   ├── gemini/
│   │   └── client.ts             # Server-only Gemini wrapper
│   ├── data/
│   │   ├── songs.ts              # Phase 1: song queries
│   │   ├── artists.ts            # Phase 1: artist queries
│   │   ├── sessions.ts           # Phase 2: chat session persistence
│   │   ├── profile.ts            # Phase 3/6: taste profile
│   │   └── feedback.ts           # Phase 6: feedback persistence
│   ├── intent/
│   │   ├── schema.ts             # Phase 2: DiscoveryIntent Zod schema
│   │   └── prompt.ts             # Phase 2: extraction prompt
│   ├── scoring/
│   │   ├── config.ts             # Phase 3: 70/30 weights + exploration tuning
│   │   ├── recommend.ts          # Phase 3: scoring + ranking
│   │   └── fallback.ts           # Phase 3: filter relaxation cascade
│   ├── explain/
│   │   ├── schema.ts             # Phase 4: explanation Zod schema
│   │   ├── prompt.ts             # Phase 4: grounded narrative prompt
│   │   └── fallback.ts           # Phase 4: template explanations
│   ├── store/
│   │   └── session.ts            # Phase 5: Zustand client state
│   ├── utils/
│   │   └── images.ts             # Phase 1: album art fallback helper
│   ├── env.ts                    # Phase 0: validated environment variables
│   └── rate-limit.ts             # Phase 7: API rate limiting
│
├── types/
│   └── index.ts                  # Shared TypeScript types (Song, Artist, Intent, etc.)
│
├── data/
│   ├── songs.seed.json           # Phase 1: sample song dataset
│   └── artists.seed.json         # Phase 1: sample artist dataset
│
├── scripts/
│   ├── seed.ts                   # Phase 1: populate Supabase
│   ├── test-intent.ts            # Phase 2: intent extraction harness
│   ├── test-recommend.ts         # Phase 3: recommendation harness
│   └── test-chat.ts              # Phase 4: end-to-end API harness
│
├── supabase/
│   └── migrations/
│       └── 0001_init.sql         # Phase 1: schema + RLS
│
├── tests/
│   ├── scoring/
│   │   └── recommend.test.ts     # Phase 3: unit tests for scoring edge cases
│   └── intent/
│       └── schema.test.ts        # Phase 2: Zod schema tests
│
├── docs/
│   ├── problemStatement.md
│   ├── architecture.md
│   ├── implementationPlan.md
│   ├── edgeCases.md
│   └── folderStructure.md        # this file
│
├── public/
│   └── images/
│       └── placeholder-album.png # Fallback album art
│
├── .env.example
├── .gitignore
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## Directory Responsibilities

| Path | Purpose | First introduced |
|---|---|---|
| `app/(marketing)/` | Route group for landing; no shared app shell | Phase 0 |
| `app/api/*` | Serverless API routes; all LLM + DB writes | Phase 0–6 |
| `components/ui/` | Reusable, unstyled/styled primitives | Phase 5 |
| `lib/data/` | Supabase query layer; no business logic | Phase 1 |
| `lib/intent/` | NLU schemas + prompts | Phase 2 |
| `lib/scoring/` | Deterministic recommendation logic | Phase 3 |
| `lib/explain/` | Grounded narrative generation | Phase 4 |
| `lib/store/` | Client-side session/chat state | Phase 5 |
| `data/` | Static seed JSON (not runtime data) | Phase 1 |
| `scripts/` | CLI harnesses; not imported by app | Phase 1+ |
| `supabase/migrations/` | Versioned SQL schema | Phase 1 |
| `tests/` | Unit tests (Vitest/Jest) | Phase 2–3 |

## Import Rules

* `app/` and `components/` may import from `lib/` and `types/`.
* `lib/gemini/`, `lib/supabase/admin.ts`, `lib/env.ts` are **server-only** — use `import "server-only"`.
* `scripts/` and `tests/` run outside Next.js; use direct env loading, not Next.js runtime.
* `data/*.seed.json` is read only by `scripts/seed.ts`, never bundled into client code.

## Phase → Folder Mapping

| Phase | Primary folders touched |
|---|---|
| 0 | `app/`, `lib/supabase/`, `lib/gemini/`, `lib/env.ts`, `types/` |
| 1 | `supabase/`, `data/`, `scripts/`, `lib/data/`, `app/api/debug/` |
| 2 | `lib/intent/`, `lib/data/sessions.ts`, `app/api/intent/`, `tests/intent/` |
| 3 | `lib/scoring/`, `lib/data/profile.ts`, `app/api/recommend/`, `tests/scoring/` |
| 4 | `lib/explain/`, `app/api/explain/`, `app/api/chat/`, `scripts/test-chat.ts` |
| 5 | `components/`, `app/chat/`, `app/results/`, `lib/store/` |
| 6 | `app/api/feedback/`, `lib/data/feedback.ts`, `components/FeedbackControls.tsx` |
| 7 | `lib/rate-limit.ts`, `public/`, `README.md`, polish across `components/` |

## Related Documents

* [Edge Cases](./edgeCases.md)
* [Implementation Plan](./implementationPlan.md)
* [Phase 1 Data Sourcing](./phase1-data-sourcing.md)

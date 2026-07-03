# Evals

Golden-set regression for Raga's AI and guardrail layers. Unlike `npm run test:*` integration scripts (which check HTTP + shape), evals score **behavior against fixed expectations**.

## Suites

| Command | What it checks | Gemini? |
|---|---|---|
| `npm run eval` | All offline suites | No |
| `npm run eval:relevance` | `isIrrelevantInput()` off-topic detection | No |
| `npm run eval:intent` | Heuristic intent + vague-input path | No |
| `npm run eval:explain` | Template explanations cite real song/artist | No |
| `npm run eval:intent -- --live` | `POST /api/intent` on golden prompts | Yes |

## Fixtures

- `evals/fixtures/intent-golden.json` — prompts with expected `intent`, `explorationLevel`, moods, genres, etc.
- `evals/fixtures/relevance-golden.json` — on-topic vs off-topic messages

Add a case when you fix a bug or ship a new guardrail. Keep IDs stable (`off-topic-weather`, `similar-coldplay`) so CI logs stay readable.

## Matchers

Shared logic in `lib/evals/`:

- `matchers.ts` — partial intent expectations (contains, not exact string match)
- `grounding.ts` — explanations must mention the candidate song and artist

## Live intent eval

Requires a running server and Gemini quota:

```bash
npm run dev
npm run eval:intent -- --live
```

Set `TEST_BASE_URL` for production/staging:

```bash
TEST_BASE_URL=https://your-app.vercel.app npm run eval:intent -- --live
```

## CI recommendation

Run offline evals on every PR (fast, deterministic):

```bash
npm run eval
```

Run `--live` only on manual QA or nightly — free-tier Gemini is 20 RPD.

## Mapping to edge cases

Many cases in [edgeCases.md](./edgeCases.md) are manual QA. Priority candidates for new golden rows:

- P2 vague input → `vague-music`, `vague-something`
- P7 off-topic chat → relevance fixture set
- P4 explanation grounding → explain eval + future LLM judge

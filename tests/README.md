# Tests

Unit and integration tests. See [docs/edgeCases.md](../docs/edgeCases.md) for per-phase QA checklists.

| Path | Phase | Focus |
|---|---|---|
| `intent/schema.test.ts` | 2 | DiscoveryIntent Zod validation |
| `scoring/recommend.test.ts` | 3 | Scoring edge cases (ties, empty profile, no matches) |

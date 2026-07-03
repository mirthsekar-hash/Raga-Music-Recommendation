import type { EvalCaseResult, EvalSummary } from "../../lib/evals/types";

export function printSummary(summary: EvalSummary): void {
  console.log(`\n=== ${summary.suite}: ${summary.passed} passed, ${summary.failed} failed ===\n`);

  for (const result of summary.results) {
    if (result.pass) {
      console.log(`✓ ${result.id}`);
    } else {
      console.error(`✗ ${result.id}`);
      if (result.detail) console.error(`  ${result.detail}`);
    }
  }
}

export function buildSummary(
  suite: string,
  results: EvalCaseResult[],
): EvalSummary {
  const passed = results.filter((r) => r.pass).length;
  return {
    suite,
    passed,
    failed: results.length - passed,
    results,
  };
}

export function exitFromSummaries(summaries: EvalSummary[]): never {
  const totalFailed = summaries.reduce((sum, s) => sum + s.failed, 0);
  process.exit(totalFailed > 0 ? 1 : 0);
}

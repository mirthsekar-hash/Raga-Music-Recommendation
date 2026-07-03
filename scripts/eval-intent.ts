#!/usr/bin/env tsx
import { heuristicExtractIntent } from "../lib/intent/heuristic";
import { isVagueInput } from "../lib/intent/prompt";
import { FALLBACK_INTENT, VAGUE_INPUT_CLARIFYING_QUESTION } from "../lib/intent/schema";
import { matchIntentExpectation } from "../lib/evals/matchers";
import type { IntentGoldenCase } from "../lib/evals/types";
import { buildSummary, exitFromSummaries, printSummary } from "./lib/eval-runner";
import { loadEnv, readJsonFile } from "./lib/load-env";

loadEnv();

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const runLive = process.argv.includes("--live");

function evaluateOffline(cases: IntentGoldenCase[]) {
  return cases.map((testCase) => {
    if (testCase.expect.vagueInput) {
      const vague = isVagueInput(testCase.message);
      if (!vague) {
        return {
          id: testCase.id,
          pass: false,
          detail: "expected isVagueInput() to be true",
        };
      }

      const actual = {
        intent: { ...FALLBACK_INTENT },
        clarifyingQuestion: VAGUE_INPUT_CLARIFYING_QUESTION,
      };
      const { pass, reasons } = matchIntentExpectation(actual, testCase.expect);
      return { id: testCase.id, pass, detail: reasons.join("; ") || undefined };
    }

    const extraction = heuristicExtractIntent(testCase.message);
    const { clarifyingQuestion, ...intentFields } = extraction;
    const actual = { intent: intentFields, clarifyingQuestion };
    const { pass, reasons } = matchIntentExpectation(actual, testCase.expect);
    return { id: testCase.id, pass, detail: reasons.join("; ") || undefined };
  });
}

async function evaluateLive(cases: IntentGoldenCase[]) {
  const liveCases = cases.filter((c) => !c.expect.vagueInput);
  const results = [];

  for (const testCase of liveCases) {
    try {
      const response = await fetch(`${BASE_URL}/api/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: testCase.message }),
      });

      const body = await response.json();
      if (!response.ok) {
        results.push({
          id: testCase.id,
          pass: false,
          detail: body.error ?? `HTTP ${response.status}`,
        });
        continue;
      }

      const actual = {
        intent: body.intent,
        clarifyingQuestion: body.clarifyingQuestion as string | undefined,
      };
      const { pass, reasons } = matchIntentExpectation(actual, testCase.expect);
      results.push({ id: testCase.id, pass, detail: reasons.join("; ") || undefined });
    } catch (error) {
      results.push({
        id: testCase.id,
        pass: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

async function main() {
  const cases = readJsonFile<IntentGoldenCase[]>("evals/fixtures/intent-golden.json");
  const summaries = [];

  console.log("=== Intent Eval — heuristic fallback (offline) ===\n");
  const offlineResults = evaluateOffline(cases);
  const offlineSummary = buildSummary("Intent Eval (heuristic)", offlineResults);
  printSummary(offlineSummary);
  summaries.push(offlineSummary);

  if (runLive) {
    console.log(`\n=== Intent Eval — live API (${BASE_URL}) ===\n`);
    const liveResults = await evaluateLive(cases);
    const liveSummary = buildSummary("Intent Eval (live)", liveResults);
    printSummary(liveSummary);
    summaries.push(liveSummary);
  } else {
    console.log("\nTip: run with --live to also score POST /api/intent (uses Gemini quota).\n");
  }

  exitFromSummaries(summaries);
}

main().catch((error) => {
  console.error(error);
  console.error("\nTip: for --live, start the dev server with `npm run dev` first.");
  process.exit(1);
});

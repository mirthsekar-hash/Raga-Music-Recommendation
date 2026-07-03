#!/usr/bin/env tsx
import { isIrrelevantInput } from "../lib/intent/relevance";
import type { RelevanceGoldenCase } from "../lib/evals/types";
import { buildSummary, exitFromSummaries, printSummary } from "./lib/eval-runner";
import { loadEnv, readJsonFile } from "./lib/load-env";

loadEnv();

function runRelevanceEval(): void {
  const cases = readJsonFile<RelevanceGoldenCase[]>("evals/fixtures/relevance-golden.json");

  console.log("=== Relevance Eval (rule-based, no Gemini) ===\n");

  const results = cases.map((testCase) => {
    const actual = isIrrelevantInput(testCase.message);
    const pass = actual === testCase.expectIrrelevant;
    return {
      id: testCase.id,
      pass,
      detail: pass
        ? undefined
        : `expected irrelevant=${testCase.expectIrrelevant}, got ${actual}`,
    };
  });

  const summary = buildSummary("Relevance Eval", results);
  printSummary(summary);
  exitFromSummaries([summary]);
}

runRelevanceEval();

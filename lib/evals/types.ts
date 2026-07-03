import type { DiscoveryIntent } from "@/lib/intent/schema";

export interface IntentExpectation {
  intent?: string;
  explorationLevel?: string;
  moodContains?: string[];
  genreContains?: string[];
  seedArtistContains?: string;
  activityContains?: string;
  requiresClarifying?: boolean;
  /** When true, case is evaluated via vague-input path instead of heuristic. */
  vagueInput?: boolean;
}

export interface IntentGoldenCase {
  id: string;
  message: string;
  expect: IntentExpectation;
}

export interface RelevanceGoldenCase {
  id: string;
  message: string;
  expectIrrelevant: boolean;
}

export interface IntentEvalActual {
  intent: DiscoveryIntent;
  clarifyingQuestion?: string;
}

export interface EvalCaseResult {
  id: string;
  pass: boolean;
  detail?: string;
}

export interface EvalSummary {
  suite: string;
  passed: number;
  failed: number;
  results: EvalCaseResult[];
}

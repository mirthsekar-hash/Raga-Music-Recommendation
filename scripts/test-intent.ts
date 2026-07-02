#!/usr/bin/env tsx
import { assertSensibleIntent } from "../lib/intent/heuristic";
import { loadEnv } from "./lib/load-env";
import { SUGGESTED_PROMPTS } from "../types";

loadEnv();

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

interface IntentApiResponse {
  sessionId: string;
  intent: {
    intent: string;
    explorationLevel: string;
    mood?: string[];
    activity?: string;
    genre?: string[];
    seedArtist?: string;
  };
  clarifyingQuestion?: string;
}

async function postIntent(message: string, sessionId?: string): Promise<IntentApiResponse> {
  const response = await fetch(`${BASE_URL}/api/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }

  return body as IntentApiResponse;
}

async function main() {
  console.log(`=== Phase 2 Intent API Tests (${BASE_URL}) ===\n`);

  let passed = 0;
  let failed = 0;
  let sessionId: string | undefined;

  for (const message of SUGGESTED_PROMPTS) {
    try {
      const result = await postIntent(message, sessionId);
      sessionId = result.sessionId;
      const { intent } = result;

      console.log(`✓ "${message}"`);
      console.log(`  sessionId: ${result.sessionId}`);
      console.log(`  intent: ${intent.intent}`);
      console.log(`  exploration: ${intent.explorationLevel}`);
      if (intent.mood?.length) console.log(`  mood: ${intent.mood.join(", ")}`);
      if (intent.activity) console.log(`  activity: ${intent.activity}`);
      if (intent.genre?.length) console.log(`  genre: ${intent.genre.join(", ")}`);
      if (intent.seedArtist) console.log(`  seedArtist: ${intent.seedArtist}`);
      console.log();

      if (!intent.intent) throw new Error("Missing intent type");
      if (!assertSensibleIntent(message, intent as Parameters<typeof assertSensibleIntent>[1])) {
        throw new Error(`Intent not sensible for prompt: ${JSON.stringify(intent)}`);
      }
      passed++;
    } catch (error) {
      failed++;
      console.error(`✗ "${message}"`);
      console.error(`  ${error instanceof Error ? error.message : error}\n`);
    }
  }

  console.log("--- Ambiguous input test ---");
  try {
    const vague = await postIntent("music");
    if (vague.intent.intent === "general_discovery" && vague.clarifyingQuestion) {
      console.log('✓ "music" → general_discovery + clarifyingQuestion');
      passed++;
    } else {
      console.error('✗ "music" did not return expected fallback');
      failed++;
    }
  } catch (error) {
    failed++;
    console.error(`✗ ambiguous test: ${error instanceof Error ? error.message : error}`);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  console.error("\nTip: start the dev server with `npm run dev` before running tests.");
  process.exit(1);
});

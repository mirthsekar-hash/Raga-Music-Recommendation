#!/usr/bin/env tsx
import { loadEnv } from "./lib/load-env";
import { SUGGESTED_PROMPTS } from "../types";

loadEnv();

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

interface ChatApiResponse {
  sessionId: string;
  chatReply: string;
  clarifyingQuestion?: string;
  intent: {
    intent: string;
    explorationLevel: string;
    genre?: string[];
    mood?: string[];
    activity?: string;
    seedArtist?: string;
  };
  cards: Array<{
    candidate: {
      song: { id: string; song_name: string; genre: string };
      artist: { name: string };
      finalScore: number;
      matchedSignals: { isHiddenGem: boolean; isEmergingArtist: boolean; isTrending?: boolean };
    };
    explanation: {
      songId: string;
      whyYoullLikeIt: string;
      whyInteresting: string;
      discoverySource: string;
      explorationPath: string[];
    };
  }>;
  partial?: boolean;
  explanationsFromTemplate?: boolean;
}

async function postChat(
  message: string,
  sessionId?: string,
): Promise<ChatApiResponse> {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }

  return body as ChatApiResponse;
}

function printCards(result: ChatApiResponse) {
  console.log(`  chatReply: ${result.chatReply}`);
  if (result.clarifyingQuestion) console.log(`  clarifying: ${result.clarifyingQuestion}`);
  console.log(`  intent: ${result.intent.intent} (${result.intent.explorationLevel})`);
  if (result.explanationsFromTemplate) console.log("  (template explanations)");
  for (const card of result.cards.slice(0, 3)) {
    console.log(
      `  • ${card.candidate.song.song_name} — ${card.candidate.artist.name}`,
    );
    console.log(`    like: ${card.explanation.whyYoullLikeIt}`);
    console.log(`    interesting: ${card.explanation.whyInteresting}`);
    console.log(`    source: ${card.explanation.discoverySource}`);
  }
  if (result.cards.length > 3) {
    console.log(`  … and ${result.cards.length - 3} more`);
  }
}

async function main() {
  console.log(`=== Phase 4 Chat API Tests (${BASE_URL}) ===\n`);

  let passed = 0;
  let failed = 0;
  let sessionId: string | undefined;

  function pass(label: string) {
    console.log(`✓ ${label}`);
    passed++;
  }

  function fail(label: string, error: unknown) {
    console.error(`✗ ${label}`);
    console.error(`  ${error instanceof Error ? error.message : error}`);
    failed++;
  }

  // Full chat flow
  try {
    const message = "Give me chill indie for a late-night drive";
    const result = await postChat(message, sessionId);
    sessionId = result.sessionId;
    console.log(`"${message}"`);
    printCards(result);

    if (!result.chatReply) throw new Error("Missing chatReply");
    if (!result.cards.length) throw new Error("Expected recommendation cards");
    if (result.cards.some((c) => c.explanation.songId !== c.candidate.song.id)) {
      throw new Error("Explanation songId mismatch");
    }
    pass("full chat returns reply + narrated cards");
  } catch (error) {
    fail("full chat flow", error);
  }

  console.log();

  // Suggested prompt smoke test (first only to save Gemini quota)
  try {
    const message = SUGGESTED_PROMPTS[1];
    const result = await postChat(message, sessionId);
    sessionId = result.sessionId;
    console.log(`"${message}"`);
    printCards(result);
    if (!result.chatReply) throw new Error("Missing chatReply");
    pass("second prompt returns valid chat response");
  } catch (error) {
    fail("suggested prompt", error);
  }

  console.log();

  // Ambiguous input
  try {
    const result = await postChat("music", sessionId);
    sessionId = result.sessionId;
    if (!result.clarifyingQuestion || result.cards.length > 0) {
      throw new Error("Expected clarifying question without cards");
    }
    pass("vague input returns clarifying question only");
  } catch (error) {
    fail("vague input", error);
  }

  console.log();

  // Empty candidates guard on /api/explain
  try {
    const res = await fetch(`${BASE_URL}/api/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: { intent: "general_discovery", explorationLevel: "balanced" },
        candidates: [],
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    pass("empty candidates rejected on /api/explain");
  } catch (error) {
    fail("explain validation", error);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  console.error("\nTip: start the dev server with `npm run dev` before running tests.");
  process.exit(1);
});

#!/usr/bin/env tsx
import { loadEnv } from "./lib/load-env";
import type { DiscoveryIntent } from "../lib/intent/schema";

loadEnv();

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

interface RecommendApiResponse {
  sessionId?: string;
  candidates: Array<{
    song: { id: string; song_name: string; genre: string };
    artist: { name: string };
    personalScore: number;
    culturalScore: number;
    finalScore: number;
    matchedSignals: {
      genreMatch?: string;
      moodMatch?: string;
      isHiddenGem: boolean;
      isEmergingArtist: boolean;
      communityBuzzScore: number;
    };
  }>;
  count: number;
  partial?: boolean;
}

async function postRecommend(
  intent: DiscoveryIntent,
  sessionId?: string,
  limit?: number,
): Promise<RecommendApiResponse> {
  const response = await fetch(`${BASE_URL}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, sessionId, limit }),
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? `HTTP ${response.status}`);
  }

  return body as RecommendApiResponse;
}

function printCandidates(label: string, result: RecommendApiResponse) {
  console.log(`\n${label} (${result.count} candidates${result.partial ? ", partial" : ""})`);
  for (const c of result.candidates.slice(0, 5)) {
    console.log(
      `  • ${c.song.song_name} — ${c.artist.name} | final=${c.finalScore} personal=${c.personalScore} cultural=${c.culturalScore}`,
    );
    const signals = [
      c.matchedSignals.genreMatch && `genre:${c.matchedSignals.genreMatch}`,
      c.matchedSignals.moodMatch && `mood:${c.matchedSignals.moodMatch}`,
      c.matchedSignals.isHiddenGem && "hidden_gem",
      c.matchedSignals.isEmergingArtist && "emerging",
    ]
      .filter(Boolean)
      .join(", ");
    if (signals) console.log(`    signals: ${signals}`);
  }
}

async function main() {
  console.log(`=== Phase 3 Recommend API Tests (${BASE_URL}) ===\n`);

  let passed = 0;
  let failed = 0;

  function pass(label: string) {
    console.log(`✓ ${label}`);
    passed++;
  }

  function fail(label: string, error: unknown) {
    console.error(`✗ ${label}`);
    console.error(`  ${error instanceof Error ? error.message : error}`);
    failed++;
  }

  // Mood + genre intent
  try {
    const moodIntent: DiscoveryIntent = {
      intent: "mood_based",
      explorationLevel: "balanced",
      genre: ["indie"],
      mood: ["chill"],
    };
    const result = await postRecommend(moodIntent);
    if (result.count < 1) throw new Error("Expected at least 1 candidate");
    if (!result.candidates[0]?.finalScore && result.candidates[0]?.finalScore !== 0) {
      throw new Error("Missing score breakdown");
    }
    printCandidates("Mood + genre", result);
    pass("mood_based indie/chill returns scored candidates");
  } catch (error) {
    fail("mood_based indie/chill", error);
  }

  // Similar artist intent
  try {
    const similarIntent: DiscoveryIntent = {
      intent: "similar_to",
      explorationLevel: "balanced",
      seedArtist: "Coldplay",
    };
    const result = await postRecommend(similarIntent);
    printCandidates("Similar to Coldplay", result);
    pass("similar_to seedArtist returns candidates");
  } catch (error) {
    fail("similar_to seedArtist", error);
  }

  // Adventurous vs conservative
  try {
    const base: DiscoveryIntent = {
      intent: "general_discovery",
      explorationLevel: "balanced",
      genre: ["indie"],
    };
    const conservative = await postRecommend({ ...base, explorationLevel: "conservative" });
    const adventurous = await postRecommend({ ...base, explorationLevel: "adventurous" });

    const avgCultural = (r: RecommendApiResponse) =>
      r.candidates.reduce((s, c) => s + c.culturalScore, 0) / Math.max(r.candidates.length, 1);

    if (avgCultural(adventurous) < avgCultural(conservative)) {
      throw new Error("Adventurous should not have lower avg cultural score");
    }
    printCandidates("Conservative", conservative);
    printCandidates("Adventurous", adventurous);
    pass("adventurous ≥ conservative avg cultural score");
  } catch (error) {
    fail("exploration level comparison", error);
  }

  // general_discovery with no signals
  try {
    const general: DiscoveryIntent = {
      intent: "general_discovery",
      explorationLevel: "balanced",
    };
    const result = await postRecommend(general);
    if (result.count < 1) throw new Error("Expected candidates for general_discovery");
    pass("general_discovery returns candidates without genre/mood");
  } catch (error) {
    fail("general_discovery", error);
  }

  // Invalid limit capped at 8
  try {
    const res = await fetch(`${BASE_URL}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: { intent: "general_discovery", explorationLevel: "balanced" },
        limit: 100,
      }),
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
    pass("limit > 8 rejected with 400");
  } catch (error) {
    fail("limit validation", error);
  }

  // Deterministic: same request twice
  try {
    const intent: DiscoveryIntent = {
      intent: "mood_based",
      explorationLevel: "balanced",
      genre: ["electronic"],
      mood: ["energetic"],
    };
    const a = await postRecommend(intent);
    const b = await postRecommend(intent);
    const idsA = a.candidates.map((c) => c.song.id).join(",");
    const idsB = b.candidates.map((c) => c.song.id).join(",");
    if (idsA !== idsB) throw new Error("Rankings differ between identical requests");
    pass("deterministic ranking for same intent");
  } catch (error) {
    fail("deterministic ranking", error);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  console.error("\nTip: start the dev server with `npm run dev` before running tests.");
  process.exit(1);
});

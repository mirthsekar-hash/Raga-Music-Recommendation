#!/usr/bin/env tsx
import { loadEnv } from "./lib/load-env";
import type { FeedbackAction } from "../types";

loadEnv();

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";

interface ChatApiResponse {
  sessionId: string;
  cards: Array<{
    candidate: { song: { id: string; song_name: string } };
  }>;
}

interface FeedbackApiResponse {
  ok: true;
  action: FeedbackAction;
  songId: string;
  profile: {
    preferred_genres: string[];
    favorite_artists: string[];
    exploration_level: string;
  };
  analytics: {
    love: number;
    skip: number;
    more_like_this: number;
    total: number;
  };
  followUp?: {
    chatReply: string;
    cards: unknown[];
  };
}

async function postChat(message: string): Promise<ChatApiResponse> {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body as ChatApiResponse;
}

async function postFeedback(
  sessionId: string,
  songId: string,
  action: FeedbackAction,
): Promise<FeedbackApiResponse> {
  const response = await fetch(`${BASE_URL}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, songId, action }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body as FeedbackApiResponse;
}

async function postRecommend(sessionId: string, intent: unknown) {
  const response = await fetch(`${BASE_URL}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, intent, limit: 5 }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body as { candidates: Array<{ song: { id: string; song_name: string } }> };
}

async function main() {
  console.log(`=== Phase 6 Feedback API Tests (${BASE_URL}) ===\n`);

  let passed = 0;
  let failed = 0;

  const assert = (label: string, ok: boolean, detail?: string) => {
    if (ok) {
      passed++;
      console.log(`✓ ${label}`);
      if (detail) console.log(`  ${detail}`);
    } else {
      failed++;
      console.log(`✗ ${label}`);
      if (detail) console.log(`  ${detail}`);
    }
  };

  try {
    const chat = await postChat("Suggest underrated indie artists");
    assert("chat returns session + cards", !!chat.sessionId && chat.cards.length > 0);

    const songId = chat.cards[0].candidate.song.id;
    const songName = chat.cards[0].candidate.song.song_name;

    const love = await postFeedback(chat.sessionId, songId, "love");
    assert(
      "love feedback persists profile",
      love.ok && love.analytics.love >= 1,
      `genres: ${love.profile.preferred_genres.join(", ") || "(none)"}`,
    );

    const skipSongId = chat.cards[1]?.candidate.song.id ?? songId;
    const skip = await postFeedback(chat.sessionId, skipSongId, "skip");
    assert("skip feedback recorded", skip.ok && skip.analytics.skip >= 1);

    const more = await postFeedback(chat.sessionId, songId, "more_like_this");
    assert(
      "more_like_this returns follow-up",
      !!more.followUp && Array.isArray(more.followUp.cards),
      more.followUp
        ? `reply: ${more.followUp.chatReply.slice(0, 80)}… cards: ${more.followUp.cards.length}`
        : undefined,
    );

    const recommend = await postRecommend(chat.sessionId, {
      intent: "general_discovery",
      explorationLevel: "balanced",
      genre: love.profile.preferred_genres.slice(0, 2),
    });
    const skippedInResults = recommend.candidates.some((c) => c.song.id === skipSongId);
    assert(
      "recommend excludes skipped songs",
      !skippedInResults || skipSongId === songId,
      `checked skip id ${skipSongId} against ${recommend.candidates.length} candidates`,
    );

    console.log(`\nSong tested: ${songName} (${songId})`);
  } catch (error) {
    failed++;
    console.error("\nTest run error:", error instanceof Error ? error.message : error);
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

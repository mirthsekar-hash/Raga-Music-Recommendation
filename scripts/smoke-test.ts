#!/usr/bin/env tsx
import { loadEnv } from "./lib/load-env";

loadEnv();

const BASE_URL =
  process.env.TEST_BASE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

interface Step {
  name: string;
  run: () => Promise<void>;
}

async function getHealth() {
  const response = await fetch(`${BASE_URL}/api/health`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.message ?? `Health check failed (${response.status})`);
  }
  if (body.supabase !== "ok" || body.gemini !== "ok") {
    throw new Error(`Degraded health: ${JSON.stringify(body)}`);
  }
}

async function postChat() {
  const response = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Chill indie hidden gems" }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Chat failed (${response.status})`);
  if (!body.sessionId || !body.chatReply) {
    throw new Error("Chat response missing sessionId or chatReply");
  }
  return body as { sessionId: string; cards: Array<{ candidate: { song: { id: string } } }> };
}

async function postFeedback(sessionId: string, songId: string) {
  const response = await fetch(`${BASE_URL}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, songId, action: "love" }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `Feedback failed (${response.status})`);
}

async function getPages() {
  for (const path of ["/", "/chat", "/results"]) {
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  }
}

const steps: Step[] = [
  { name: "Health check", run: getHealth },
  { name: "Marketing + app pages", run: getPages },
  {
    name: "Chat orchestration",
    run: async () => {
      const chat = await postChat();
      if (chat.cards.length) {
        await postFeedback(chat.sessionId, chat.cards[0].candidate.song.id);
      }
    },
  },
];

async function main() {
  console.log(`=== Raga smoke test (${BASE_URL}) ===\n`);

  let failed = 0;
  for (const step of steps) {
    try {
      await step.run();
      console.log(`✓ ${step.name}`);
    } catch (error) {
      failed += 1;
      console.log(`✗ ${step.name}`);
      console.log(`  ${error instanceof Error ? error.message : error}`);
    }
  }

  console.log(`\n=== ${steps.length - failed}/${steps.length} passed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

#!/usr/bin/env tsx
/**
 * Production Gemini diagnostic — checks health, intent, and full chat orchestration.
 *
 * Usage:
 *   TEST_BASE_URL=https://raga-music-recommendation.vercel.app npm run diagnose:gemini
 */
import { loadEnv } from "./lib/load-env";

loadEnv();

const BASE_URL =
  process.env.TEST_BASE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const TEST_MESSAGE = process.env.DIAGNOSE_MESSAGE ?? "Suggest trending jazz music";

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    console.log(`✓ ${label} (${Date.now() - start}ms)`);
    return result;
  } catch (error) {
    console.log(`✗ ${label} (${Date.now() - start}ms)`);
    throw error;
  }
}

async function main() {
  console.log(`=== Gemini production diagnostic (${BASE_URL}) ===\n`);
  console.log(`Test message: "${TEST_MESSAGE}"\n`);

  const health = await timed("GET /api/health", async () => {
    const response = await fetch(`${BASE_URL}/api/health`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.message ?? `HTTP ${response.status}`);
    return body as {
      supabase: string;
      gemini: string;
      message?: string;
      quota?: { dailyRequests: number; dailyLimit: number };
      circuit?: { open: boolean; retryAfterMs: number };
    };
  });

  console.log(`  supabase: ${health.supabase}`);
  console.log(`  gemini: ${health.gemini}`);
  if (health.quota) {
    console.log(
      `  quota: ${health.quota.dailyRequests}/${health.quota.dailyLimit} daily requests`,
    );
  }
  if (health.circuit?.open) {
    console.log(`  circuit: OPEN (retry in ${Math.ceil(health.circuit.retryAfterMs / 1000)}s)`);
  }
  console.log();

  const intent = await timed("POST /api/intent", async () => {
    const response = await fetch(`${BASE_URL}/api/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: TEST_MESSAGE }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
    return body;
  });

  console.log(`  intent: ${JSON.stringify(intent.intent)}`);
  console.log();

  try {
    const chat = await timed("POST /api/chat (full orchestration)", async () => {
      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: TEST_MESSAGE }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
      return body as {
        cards: unknown[];
        explanationsFromTemplate?: boolean;
        chatReply: string;
      };
    });

    console.log(`  cards: ${chat.cards.length}`);
    console.log(`  explanationsFromTemplate: ${Boolean(chat.explanationsFromTemplate)}`);
    console.log(`  chatReply: ${chat.chatReply.slice(0, 100)}…`);
    console.log();

    if (chat.explanationsFromTemplate) {
      console.log(
        "⚠ Explain step used template fallback (quota exhausted, circuit open, or Gemini error).",
      );
    } else {
      console.log("✓ Full chat used Gemini for explanations.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log();
    if (message.includes("TIMEOUT") || message.includes("timeout")) {
      console.log(
        "⚠ Chat timed out — likely exceeded Vercel 60s limit before explain Gemini call completed.",
      );
      console.log("  Intent may still have hit Gemini; explain often does not finish in time.");
    } else {
      console.log(`⚠ Chat failed: ${message}`);
    }
  }

  console.log("\n=== Diagnostic complete ===");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  GEMINI_FREE_TIER,
  GEMINI_MVP_BUDGET,
  estimateTokens,
} from "@/lib/gemini/config";

export class GeminiQuotaExceededError extends Error {
  constructor(
    message: string,
    public readonly code: "rpm" | "tpm" | "rpd" | "daily_budget",
  ) {
    super(message);
    this.name = "GeminiQuotaExceededError";
  }
}

/** In-process sliding window for RPM/TPM (best-effort on warm serverless instances). */
const minuteWindow: { ts: number; requests: number; tokens: number }[] = [];

let lastCallAt = 0;

/** Allows the next Gemini call in this instance to skip the inter-call delay (chat orchestration). */
let orchestrationBurstRemaining = 0;

export function allowOrchestrationBurst(): void {
  orchestrationBurstRemaining = 1;
}

function pruneMinuteWindow(now: number): void {
  const cutoff = now - 60_000;
  while (minuteWindow.length > 0 && minuteWindow[0].ts < cutoff) {
    minuteWindow.shift();
  }
}

function getMinuteTotals(now: number): { requests: number; tokens: number } {
  pruneMinuteWindow(now);
  return minuteWindow.reduce(
    (acc, entry) => ({
      requests: acc.requests + entry.requests,
      tokens: acc.tokens + entry.tokens,
    }),
    { requests: 0, tokens: 0 },
  );
}

function recordInMemoryUsage(tokens: number): void {
  const now = Date.now();
  minuteWindow.push({ ts: now, requests: 1, tokens });
}

async function getDailyUsage(): Promise<{ requests: number; tokens: number }> {
  try {
    const supabase = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("gemini_usage")
      .select("request_count, token_count")
      .eq("usage_date", today)
      .maybeSingle();

    if (error || !data) return { requests: 0, tokens: 0 };
    return {
      requests: data.request_count ?? 0,
      tokens: Number(data.token_count ?? 0),
    };
  } catch {
    return { requests: 0, tokens: 0 };
  }
}

async function recordDailyUsage(tokens: number): Promise<void> {
  try {
    const supabase = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const daily = await getDailyUsage();

    await supabase.from("gemini_usage").upsert(
      {
        usage_date: today,
        request_count: daily.requests + 1,
        token_count: daily.tokens + tokens,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "usage_date" },
    );
  } catch {
    // Non-fatal: in-memory limits still apply
  }
}

export async function assertQuotaAvailable(estimatedTokens: number): Promise<void> {
  const now = Date.now();
  const minute = getMinuteTotals(now);
  const daily = await getDailyUsage();

  if (daily.requests >= GEMINI_FREE_TIER.requestsPerDay) {
    throw new GeminiQuotaExceededError(
      `Daily Gemini limit reached (${GEMINI_FREE_TIER.requestsPerDay} RPD). Try again tomorrow.`,
      "rpd",
    );
  }

  if (minute.requests >= GEMINI_FREE_TIER.requestsPerMinute) {
    throw new GeminiQuotaExceededError(
      `Gemini rate limit reached (${GEMINI_FREE_TIER.requestsPerMinute} RPM). Please wait a moment.`,
      "rpm",
    );
  }

  if (minute.tokens + estimatedTokens > GEMINI_FREE_TIER.tokensPerMinute) {
    throw new GeminiQuotaExceededError(
      `Gemini token limit reached (${GEMINI_FREE_TIER.tokensPerMinute} TPM). Please wait a moment.`,
      "tpm",
    );
  }
}

export async function waitForCallSlot(): Promise<void> {
  if (orchestrationBurstRemaining > 0) {
    orchestrationBurstRemaining -= 1;
    return;
  }

  const elapsed = Date.now() - lastCallAt;
  if (elapsed < GEMINI_MVP_BUDGET.minDelayBetweenCallsMs) {
    await new Promise((r) =>
      setTimeout(r, GEMINI_MVP_BUDGET.minDelayBetweenCallsMs - elapsed),
    );
  }
}

export async function recordGeminiUsage(prompt: string, responseText: string): Promise<void> {
  const tokens = estimateTokens(prompt) + estimateTokens(responseText);
  recordInMemoryUsage(tokens);
  await recordDailyUsage(tokens);
  lastCallAt = Date.now();
}

export async function getQuotaStatus(): Promise<{
  dailyRequests: number;
  dailyLimit: number;
  minuteRequests: number;
  minuteLimit: number;
}> {
  const daily = await getDailyUsage();
  const minute = getMinuteTotals(Date.now());
  return {
    dailyRequests: daily.requests,
    dailyLimit: GEMINI_FREE_TIER.requestsPerDay,
    minuteRequests: minute.requests,
    minuteLimit: GEMINI_FREE_TIER.requestsPerMinute,
  };
}

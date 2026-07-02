import "server-only";

import type { GenerateContentResult } from "@google/generative-ai";
import { createGeminiClient } from "@/lib/gemini/sdk";
import {
  GEMINI_MVP_BUDGET,
  type GeminiPurpose,
  getMaxOutputTokens,
} from "@/lib/gemini/config";
import {
  assertQuotaAvailable,
  GeminiQuotaExceededError,
  recordGeminiUsage,
  waitForCallSlot,
} from "@/lib/gemini/quota";
import {
  GeminiCircuitOpenError,
  isGeminiCircuitOpen,
  recordGeminiFailure,
  recordGeminiSuccess,
} from "@/lib/gemini/circuit-breaker";
import { getServerEnv } from "@/lib/env";
import { estimateTokens } from "@/lib/gemini/config";

export { GeminiQuotaExceededError } from "@/lib/gemini/quota";
export { GeminiCircuitOpenError } from "@/lib/gemini/circuit-breaker";

function truncateInput(prompt: string, maxChars: number): string {
  if (prompt.length <= maxChars) return prompt;
  return `${prompt.slice(0, maxChars)}\n\n[truncated for token budget]`;
}

function isRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("429") ||
    message.toLowerCase().includes("quota") ||
    message.toLowerCase().includes("rate limit") ||
    message.toLowerCase().includes("resource exhausted")
  );
}

export interface GenerateOptions {
  purpose: GeminiPurpose;
  prompt: string;
  systemInstruction?: string;
}

/**
 * Single entry point for all Gemini calls — enforces free-tier RPM/TPM/RPD budgets.
 */
export async function generateWithQuota({
  purpose,
  prompt,
  systemInstruction,
}: GenerateOptions): Promise<string> {
  if (isGeminiCircuitOpen()) {
    throw new GeminiCircuitOpenError();
  }

  const maxInput = GEMINI_MVP_BUDGET.maxInputChars[purpose === "health" ? "chat" : purpose];
  const trimmedPrompt = truncateInput(prompt, maxInput);
  const estimatedTokens = estimateTokens(trimmedPrompt) + getMaxOutputTokens(purpose);

  await assertQuotaAvailable(estimatedTokens);

  const env = getServerEnv();
  const client = createGeminiClient();
  const model = client.getGenerativeModel({
    model: env.GEMINI_MODEL,
    systemInstruction,
    generationConfig: {
      maxOutputTokens: getMaxOutputTokens(purpose),
      temperature: purpose === "health" ? 0 : 0.4,
      ...(purpose === "intent" || purpose === "explain"
        ? { responseMimeType: "application/json" as const }
        : {}),
    },
  });

  let lastError: unknown;

  for (let attempt = 0; attempt <= GEMINI_MVP_BUDGET.maxRetriesOn429; attempt++) {
    try {
      await waitForCallSlot();
      const result: GenerateContentResult = await model.generateContent(trimmedPrompt);
      const text = result.response.text();
      await recordGeminiUsage(trimmedPrompt, text);
      recordGeminiSuccess();
      return text;
    } catch (error) {
      lastError = error;
      if (error instanceof GeminiQuotaExceededError) throw error;
      if (error instanceof GeminiCircuitOpenError) throw error;
      recordGeminiFailure();
      if (isRateLimitError(error) && attempt < GEMINI_MVP_BUDGET.maxRetriesOn429) {
        await new Promise((r) =>
          setTimeout(r, GEMINI_MVP_BUDGET.retryBackoffMs * (attempt + 1)),
        );
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

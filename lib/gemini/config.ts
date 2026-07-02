/**
 * Google Gemini API — Free Tier limits.
 * @see docs/gemini-limits.md
 */
export const GEMINI_FREE_TIER = {
  maxContextTokens: 1_048_576,
  requestsPerMinute: 5,
  tokensPerMinute: 250_000,
  requestsPerDay: 20,
} as const;

/**
 * MVP call/token budgets — keeps a single user journey well under free-tier caps.
 */
export const GEMINI_MVP_BUDGET = {
  /** Max Gemini calls per /api/chat orchestration (intent + batched explain). */
  maxCallsPerChatTurn: 2,
  /** Max retries on malformed JSON (each retry = extra RPM/RPD). */
  maxJsonRetries: 1,
  /** Output token caps per call type. */
  maxOutputTokens: {
    health: 16,
    intent: 512,
    explain: 4096,
    chat: 256,
  },
  /** Conservative input size guards (chars ≈ tokens/4). */
  maxInputChars: {
    intent: 8_000,
    explain: 24_000,
    chat: 12_000,
  },
  /** Estimated tokens reserved per full chat turn for TPM planning. */
  estimatedTokensPerChatTurn: 4_000,
  /** Minimum gap between Gemini calls (5 RPM ≈ 1 req / 12s). */
  minDelayBetweenCallsMs: 12_000,
  /** Retries when Gemini returns 429. */
  maxRetriesOn429: 2,
  /** Base backoff for 429 (ms). */
  retryBackoffMs: 5_000,
} as const;

/** ~10 full demo sessions/day at 2 calls each, leaving headroom for health/tests. */
export const GEMINI_DAILY_SESSION_BUDGET = Math.floor(
  GEMINI_FREE_TIER.requestsPerDay / GEMINI_MVP_BUDGET.maxCallsPerChatTurn,
);

export type GeminiPurpose = "health" | "intent" | "explain" | "chat";

export function getMaxOutputTokens(purpose: GeminiPurpose): number {
  return GEMINI_MVP_BUDGET.maxOutputTokens[purpose];
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Simple in-memory per-IP rate limiter for API routes.
 * Complements Gemini quota — prevents abuse from exhausting the 20 RPD budget.
 *
 * Note: On Vercel serverless, counters are per-instance (not global).
 * Sufficient for MVP demos; use Redis/KV for strict global limits in production.
 */

const hits = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/** MVP: max 10 intent requests/min/IP (Gemini global cap is 5 RPM). */
export const INTENT_RATE_LIMIT = { limit: 10, windowMs: 60_000 } as const;

/** MVP: max 4 chat requests/min/IP (server enforces 5 RPM globally). */
export const CHAT_RATE_LIMIT = { limit: 4, windowMs: 60_000 } as const;

/** Recommend route has no Gemini cost — generous IP cap. */
export const RECOMMEND_RATE_LIMIT = { limit: 30, windowMs: 60_000 } as const;

/** Explain route uses Gemini — moderate IP cap. */
export const EXPLAIN_RATE_LIMIT = { limit: 10, windowMs: 60_000 } as const;

/** Feedback route — moderate IP cap with client debounce. */
export const FEEDBACK_RATE_LIMIT = { limit: 20, windowMs: 60_000 } as const;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

import type { ChatHistoryTurn } from "@/lib/intent/schema";
import type { ExtractIntentResult } from "@/lib/intent/extract";

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 100;

interface CacheEntry {
  result: ExtractIntentResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function normalizeKeyPart(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildIntentCacheKey(
  message: string,
  history?: ChatHistoryTurn[],
): string {
  const historyKey = (history ?? [])
    .slice(-4)
    .map((t) => `${t.role}:${normalizeKeyPart(t.content)}`)
    .join("|");
  return `${normalizeKeyPart(message)}::${historyKey}`;
}

export function getCachedIntent(key: string): ExtractIntentResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

export function setCachedIntent(key: string, result: ExtractIntentResult): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { result, expiresAt: Date.now() + TTL_MS });
}

import type { IntentEvalActual, IntentExpectation } from "@/lib/evals/types";

function includesAll(haystack: string[] | undefined, needles: string[]): boolean {
  if (!needles.length) return true;
  const lower = (haystack ?? []).map((v) => v.toLowerCase());
  return needles.every((needle) => lower.some((v) => v.includes(needle.toLowerCase())));
}

function includesText(haystack: string | undefined, needle: string): boolean {
  if (!needle) return true;
  return (haystack ?? "").toLowerCase().includes(needle.toLowerCase());
}

export function matchIntentExpectation(
  actual: IntentEvalActual,
  expect: IntentExpectation,
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const { intent, clarifyingQuestion } = actual;

  if (expect.intent && intent.intent !== expect.intent) {
    reasons.push(`intent: expected ${expect.intent}, got ${intent.intent}`);
  }

  if (expect.explorationLevel && intent.explorationLevel !== expect.explorationLevel) {
    reasons.push(
      `explorationLevel: expected ${expect.explorationLevel}, got ${intent.explorationLevel}`,
    );
  }

  if (expect.moodContains && !includesAll(intent.mood, expect.moodContains)) {
    reasons.push(`mood missing ${expect.moodContains.join(", ")} (got ${intent.mood?.join(", ") ?? "none"})`);
  }

  if (expect.genreContains && !includesAll(intent.genre, expect.genreContains)) {
    reasons.push(
      `genre missing ${expect.genreContains.join(", ")} (got ${intent.genre?.join(", ") ?? "none"})`,
    );
  }

  if (expect.seedArtistContains && !includesText(intent.seedArtist, expect.seedArtistContains)) {
    reasons.push(
      `seedArtist missing "${expect.seedArtistContains}" (got ${intent.seedArtist ?? "none"})`,
    );
  }

  if (expect.activityContains && !includesText(intent.activity, expect.activityContains)) {
    reasons.push(
      `activity missing "${expect.activityContains}" (got ${intent.activity ?? "none"})`,
    );
  }

  if (expect.requiresClarifying === true && !clarifyingQuestion) {
    reasons.push("expected clarifyingQuestion but none returned");
  }

  if (expect.requiresClarifying === false && clarifyingQuestion) {
    reasons.push("unexpected clarifyingQuestion");
  }

  return { pass: reasons.length === 0, reasons };
}

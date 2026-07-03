import type { RecommendationExplanation } from "@/lib/explain/schema";
import { MAX_EXPLANATION_CHARS } from "@/lib/explain/schema";
import type { RecommendationCandidate } from "@/types";

const KNOWN_DISCOVERY_SOURCES = [
  "Trending in listener communities",
  "Hidden gem from an emerging artist",
  "Indie community hidden gem",
  "Emerging artist spotlight",
  "Strong community buzz",
  "Curated discovery pick",
];

export function assertExplanationGrounded(
  explanation: RecommendationExplanation,
  candidate: RecommendationCandidate,
): string[] {
  const errors: string[] = [];
  const { song, artist } = candidate;
  const blob = `${explanation.whyYoullLikeIt} ${explanation.whyInteresting}`.toLowerCase();

  if (!blob.includes(song.song_name.toLowerCase())) {
    errors.push(`missing song name "${song.song_name}"`);
  }

  if (!blob.includes(artist.name.toLowerCase())) {
    errors.push(`missing artist name "${artist.name}"`);
  }

  if (explanation.songId !== song.id) {
    errors.push(`songId mismatch: ${explanation.songId} vs ${song.id}`);
  }

  for (const field of ["whyYoullLikeIt", "whyInteresting", "discoverySource"] as const) {
    if (explanation[field].length > MAX_EXPLANATION_CHARS) {
      errors.push(`${field} exceeds ${MAX_EXPLANATION_CHARS} chars`);
    }
    if (!explanation[field].trim()) {
      errors.push(`${field} is empty`);
    }
  }

  if (explanation.explorationPath.length === 0) {
    errors.push("explorationPath is empty");
  }

  if (
    !KNOWN_DISCOVERY_SOURCES.some((source) => explanation.discoverySource.includes(source))
  ) {
    errors.push(`unexpected discoverySource: "${explanation.discoverySource}"`);
  }

  return errors;
}

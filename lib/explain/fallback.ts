import type { DiscoveryIntent } from "@/lib/intent/schema";
import type { RecommendationCandidate } from "@/types";
import type { RecommendationExplanation } from "@/lib/explain/schema";
import { truncateForCard } from "@/lib/explain/schema";

function defaultDiscoverySource(candidate: RecommendationCandidate, intent: DiscoveryIntent): string {
  const { matchedSignals } = candidate;
  if (intent.intent === "trending" && matchedSignals.communityBuzzScore >= 0.7) {
    return "Trending in listener communities";
  }
  if (matchedSignals.isHiddenGem && matchedSignals.isEmergingArtist) {
    return "Hidden gem from an emerging artist";
  }
  if (matchedSignals.isHiddenGem) {
    return "Indie community hidden gem";
  }
  if (matchedSignals.isEmergingArtist) {
    return "Emerging artist spotlight";
  }
  if (matchedSignals.communityBuzzScore >= 0.75) {
    return "Strong community buzz";
  }
  return "Curated discovery pick";
}

function defaultExplorationPath(candidate: RecommendationCandidate): string[] {
  const path: string[] = [];
  for (const name of candidate.artist.similar_artists.slice(0, 3)) {
    path.push(name);
  }
  path.push(`more ${candidate.song.genre}`);
  return [...new Set(path)].slice(0, 4);
}

function moodPhrase(intent: DiscoveryIntent, candidate: RecommendationCandidate): string {
  const mood =
    candidate.matchedSignals.moodMatch ??
    intent.mood?.[0] ??
    candidate.song.mood[0];
  return mood ? `${mood} vibe` : "your taste";
}

export function templateExplanation(
  candidate: RecommendationCandidate,
  intent: DiscoveryIntent,
): RecommendationExplanation {
  const { song, artist, matchedSignals } = candidate;
  const mood = moodPhrase(intent, candidate);

  const genrePart = matchedSignals.genreMatch
    ? `${matchedSignals.genreMatch} fits what you asked for`
    : `${song.genre} aligns with your discovery mood`;

  const activityPart = intent.activity ? ` for ${intent.activity}` : "";

  const whyYoullLikeIt = truncateForCard(
    `${song.song_name} by ${artist.name} brings a ${mood} — ${genrePart}${activityPart}.`,
  );

  const interestingBits: string[] = [];
  if (matchedSignals.isHiddenGem) interestingBits.push("a hidden gem");
  if (matchedSignals.isEmergingArtist) interestingBits.push("an emerging artist");
  if (matchedSignals.communityBuzzScore >= 0.7) {
    interestingBits.push("solid community buzz");
  }
  if (song.popularity <= 35) interestingBits.push("off the mainstream radar");

  const whyInteresting = truncateForCard(
    interestingBits.length
      ? `Worth a listen as ${interestingBits.join(" and ")} in ${song.genre}.`
      : `A strong ${song.genre} pick with a distinctive ${mood}.`,
  );

  return {
    songId: song.id,
    whyYoullLikeIt,
    whyInteresting,
    discoverySource: defaultDiscoverySource(candidate, intent),
    explorationPath: defaultExplorationPath(candidate),
  };
}

export function templateChatReply(intent: DiscoveryIntent, count: number): string {
  const parts: string[] = [];
  if (intent.genre?.length) parts.push(intent.genre.join(" & "));
  if (intent.mood?.length) parts.push(intent.mood.join(", "));
  if (intent.activity) parts.push(`for ${intent.activity}`);
  if (intent.seedArtist) parts.push(`like ${intent.seedArtist}`);

  const descriptor = parts.length ? parts.join(" · ") : "something new";

  return `Got it — ${descriptor}. Here are ${count} picks I think you'll enjoy.`;
}

export function noMatchesChatReply(): string {
  return "I couldn't find strong matches in the catalog for that request. Try a different genre or mood?";
}

export function templateExplainBatch(
  candidates: RecommendationCandidate[],
  intent: DiscoveryIntent,
): { chatReply: string; explanations: RecommendationExplanation[] } {
  return {
    chatReply: templateChatReply(intent, candidates.length),
    explanations: candidates.map((c) => templateExplanation(c, intent)),
  };
}

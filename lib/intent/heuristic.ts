import type { DiscoveryIntent, IntentExtraction } from "@/lib/intent/schema";

const MOOD_KEYWORDS: Record<string, string> = {
  energetic: "energetic",
  chill: "chill",
  relaxing: "chill",
  sad: "melancholic",
  melancholic: "melancholic",
  happy: "upbeat",
  upbeat: "upbeat",
  dreamy: "dreamy",
};

const GENRE_KEYWORDS: Record<string, string> = {
  indie: "indie",
  rock: "rock",
  pop: "pop",
  jazz: "jazz",
  electronic: "electronic",
  "hip-hop": "hip-hop",
  rap: "hip-hop",
  folk: "folk",
  classical: "classical",
  metal: "metal",
  ambient: "ambient",
  "r-n-b": "r-n-b",
  soul: "soul",
  latin: "latin",
};

function extractSeedArtist(message: string): string | undefined {
  const patterns = [
    /similar to ([^.!?]+)/i,
    /like ([^.!?]+)/i,
    /artists? like ([^.!?]+)/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function extractActivity(message: string): string | undefined {
  const lower = message.toLowerCase();
  const activities = [
    "late-night drive",
    "night drive",
    "workout",
    "study",
    "party",
    "commute",
    "run",
    "meditation",
    "focus",
  ];
  return activities.find((a) => lower.includes(a));
}

function extractMoods(message: string): string[] {
  const lower = message.toLowerCase();
  const moods = new Set<string>();
  for (const [keyword, mood] of Object.entries(MOOD_KEYWORDS)) {
    if (lower.includes(keyword)) moods.add(mood);
  }
  return [...moods];
}

function extractGenres(message: string): string[] {
  const lower = message.toLowerCase();
  const genres = new Set<string>();
  for (const [keyword, genre] of Object.entries(GENRE_KEYWORDS)) {
    if (lower.includes(keyword)) genres.add(genre);
  }
  return [...genres];
}

/**
 * Rule-based intent extraction used when Gemini is unavailable or over quota.
 * Keeps the MVP demoable within free-tier limits.
 */
export function heuristicExtractIntent(message: string): IntentExtraction {
  const lower = message.toLowerCase();
  const seedArtist = extractSeedArtist(message);
  const activity = extractActivity(message);
  const mood = extractMoods(message);
  const genre = extractGenres(message);

  const adventurous =
    /hidden gem|underrated|emerging|niche|underground|obscure/i.test(message);
  const explorationLevel = adventurous ? "adventurous" : "balanced";

  if (seedArtist) {
    return {
      intent: "similar_to",
      seedArtist,
      explorationLevel: adventurous ? "adventurous" : "balanced",
      mood: mood.length ? mood : undefined,
      genre: genre.length ? genre : undefined,
    };
  }

  if (/trending|communities|reddit|viral/i.test(message)) {
    return {
      intent: "trending",
      genre: genre.length ? genre : ["indie"],
      explorationLevel: "adventurous",
      mood: mood.length ? mood : undefined,
    };
  }

  if (activity || /energetic|chill|relax/i.test(message)) {
    return {
      intent: "activity_based",
      activity: activity ?? (lower.includes("energetic") ? "workout" : "listening"),
      mood: mood.length ? mood : lower.includes("energetic") ? ["energetic"] : undefined,
      explorationLevel,
      genre: genre.length ? genre : undefined,
    };
  }

  if (mood.length || genre.length) {
    return {
      intent: "mood_based",
      mood: mood.length ? mood : undefined,
      genre: genre.length ? genre : undefined,
      explorationLevel,
    };
  }

  if (/underrated|hidden gem|discover/i.test(message)) {
    return {
      intent: "general_discovery",
      genre: genre.length ? genre : ["indie"],
      explorationLevel: "adventurous",
    };
  }

  return {
    intent: "general_discovery",
    explorationLevel: "balanced",
  };
}

export function assertSensibleIntent(message: string, intent: DiscoveryIntent): boolean {
  const lower = message.toLowerCase();
  if (lower.includes("similar to") || lower.includes("like coldplay")) {
    return intent.intent === "similar_to" && !!intent.seedArtist;
  }
  if (lower.includes("workout") || lower.includes("energetic")) {
    return intent.intent === "activity_based";
  }
  if (lower.includes("trending") || lower.includes("communities")) {
    return intent.intent === "trending";
  }
  if (lower.includes("underrated") || lower.includes("indie")) {
    return intent.explorationLevel === "adventurous";
  }
  if (lower.includes("drive")) {
    return intent.intent === "activity_based" || intent.intent === "mood_based";
  }
  return !!intent.intent;
}

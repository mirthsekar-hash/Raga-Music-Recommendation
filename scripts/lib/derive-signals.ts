import { clamp } from "./utils";
import { hasNicheTag, MOOD_KEYWORDS, normalizeTag } from "./genre-map";

export interface DeriveInput {
  recordingTags: string[];
  artistTags: string[];
  genre: string;
  releaseYear?: number;
  artistActiveYears?: number;
  forceHiddenGem?: boolean;
}

export interface DerivedSignals {
  popularity: number;
  artistPopularityProxy: number;
  emergingArtistFlag: boolean;
  hiddenGemFlag: boolean;
  communityBuzzScore: number;
  mood: string[];
  tagCountScore: number;
  releaseRecencyScore: number;
  artistTagScore: number;
}

export function releaseRecencyScore(releaseYear?: number): number {
  if (!releaseYear) return 45;
  const currentYear = new Date().getFullYear();
  const age = currentYear - releaseYear;
  if (age <= 3) return clamp(70 + (3 - age) * 10, 70, 100);
  if (age <= 10) return clamp(69 - (age - 3) * 4, 40, 69);
  return clamp(39 - (age - 10) * 2, 10, 39);
}

export function tagCountScore(tagCount: number): number {
  return clamp(tagCount * 8, 0, 100);
}

export function artistTagScore(tagCount: number): number {
  return clamp(tagCount * 5, 0, 100);
}

export function computePopularity(input: DeriveInput): {
  popularity: number;
  tagCountScore: number;
  releaseRecencyScore: number;
  artistTagScore: number;
} {
  const recTagScore = tagCountScore(input.recordingTags.length);
  const relRecency = releaseRecencyScore(input.releaseYear);
  const artTagScore = artistTagScore(input.artistTags.length);

  const popularity = clamp(
    Math.round(0.4 * recTagScore + 0.35 * relRecency + 0.25 * artTagScore),
    0,
    100,
  );

  return {
    popularity,
    tagCountScore: recTagScore,
    releaseRecencyScore: relRecency,
    artistTagScore: artTagScore,
  };
}

export function computeEmergingArtistFlag(input: {
  artistActiveYears?: number;
  artistTagCount: number;
  artistPopularityProxy: number;
  artistTags: string[];
}): boolean {
  const rules = [
    input.artistActiveYears !== undefined && input.artistActiveYears <= 5,
    input.artistTagCount < 15,
    input.artistPopularityProxy < 45,
    hasNicheTag(input.artistTags),
  ];
  return rules.filter(Boolean).length >= 2;
}

export function computeCommunityBuzzScore(input: {
  recordingTagCount: number;
  genre: string;
  releaseYear?: number;
  popularity: number;
  tagCountScore: number;
}): number {
  const nicheGenres = new Set(["indie", "lo-fi", "experimental", "folk", "ambient"]);
  const normalizedTagCount = clamp(input.recordingTagCount / 12, 0, 1);
  const nicheGenreBoost = nicheGenres.has(input.genre) ? 1.0 : 0.5;

  let recencyBoost = 0.4;
  if (input.releaseYear) {
    const age = new Date().getFullYear() - input.releaseYear;
    if (age < 2) recencyBoost = 1.0;
    else if (age <= 5) recencyBoost = 0.7;
  }

  const hiddenGemCandidateBoost =
    input.popularity < 40 && input.tagCountScore >= 25 ? 1.0 : 0.3;

  return clamp(
    0.35 * normalizedTagCount +
      0.3 * nicheGenreBoost +
      0.2 * recencyBoost +
      0.15 * hiddenGemCandidateBoost,
    0,
    1,
  );
}

export function computeHiddenGemFlag(input: {
  popularity: number;
  communityBuzzScore: number;
  releaseRecencyScore: number;
  tagCountScore: number;
  forceHiddenGem?: boolean;
}): boolean {
  if (input.forceHiddenGem) return true;
  return (
    input.popularity < 40 &&
    input.communityBuzzScore >= 0.55 &&
    (input.releaseRecencyScore >= 30 || input.tagCountScore >= 25)
  );
}

export function assignMoods(
  genre: string,
  genreMoodMap: Record<string, string[]>,
  recordingTags: string[],
): string[] {
  const prior = genreMoodMap[genre] ?? ["chill", "introspective"];
  const moods = [prior[0], prior[1] ?? prior[0]];

  for (const tag of recordingTags) {
    const normalized = normalizeTag(tag);
    const mood = MOOD_KEYWORDS[normalized];
    if (mood) {
      moods[1] = mood;
      break;
    }
  }

  return [...new Set(moods)].slice(0, 3);
}

export function deriveSignals(
  input: DeriveInput,
  genreMoodMap: Record<string, string[]>,
): DerivedSignals {
  const pop = computePopularity(input);
  const artistPopularityProxy = clamp(
    Math.round(0.5 * pop.artistTagScore + 0.5 * pop.releaseRecencyScore),
    0,
    100,
  );

  const emergingArtistFlag = computeEmergingArtistFlag({
    artistActiveYears: input.artistActiveYears,
    artistTagCount: input.artistTags.length,
    artistPopularityProxy,
    artistTags: input.artistTags,
  });

  const communityBuzzScore = computeCommunityBuzzScore({
    recordingTagCount: input.recordingTags.length,
    genre: input.genre,
    releaseYear: input.releaseYear,
    popularity: pop.popularity,
    tagCountScore: pop.tagCountScore,
  });

  const hiddenGemFlag = computeHiddenGemFlag({
    popularity: pop.popularity,
    communityBuzzScore,
    releaseRecencyScore: pop.releaseRecencyScore,
    tagCountScore: pop.tagCountScore,
    forceHiddenGem: input.forceHiddenGem,
  });

  const mood = assignMoods(input.genre, genreMoodMap, input.recordingTags);

  return {
    popularity: pop.popularity,
    artistPopularityProxy,
    emergingArtistFlag,
    hiddenGemFlag,
    communityBuzzScore: Math.round(communityBuzzScore * 1000) / 1000,
    mood,
    tagCountScore: pop.tagCountScore,
    releaseRecencyScore: pop.releaseRecencyScore,
    artistTagScore: pop.artistTagScore,
  };
}

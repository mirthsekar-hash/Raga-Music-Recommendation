import type { DiscoveryIntent } from "@/lib/intent/schema";
import type { Artist, MatchedSignals, Song, TasteProfile } from "@/types";
import {
  CULTURAL_SIGNAL_WEIGHTS,
  PERSONAL_SIGNAL_WEIGHTS,
  getScoreWeights,
} from "@/lib/scoring/config";

export interface ScoredSong {
  personalScore: number;
  culturalScore: number;
  finalScore: number;
  matchedSignals: MatchedSignals;
}

const ACTIVITY_MOODS: Record<string, string[]> = {
  workout: ["energetic", "groovy"],
  running: ["energetic"],
  driving: ["chill", "groovy", "hypnotic"],
  study: ["chill", "dreamy", "introspective"],
  studying: ["chill", "dreamy", "introspective"],
  sleep: ["dreamy", "chill", "ethereal"],
  party: ["energetic", "upbeat", "groovy"],
  focus: ["chill", "introspective"],
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function arraysOverlap(a: string[], b: string[]): string | undefined {
  const setB = new Set(b.map(normalize));
  for (const item of a) {
    const n = normalize(item);
    if (setB.has(n)) return item;
  }
  return undefined;
}

function resolveTargetMoods(intent: DiscoveryIntent): string[] {
  const moods = [...(intent.mood ?? [])];
  if (intent.activity) {
    const mapped = ACTIVITY_MOODS[normalize(intent.activity)];
    if (mapped) moods.push(...mapped);
  }
  return [...new Set(moods.map(normalize))];
}

function resolveTargetGenres(intent: DiscoveryIntent, profile: TasteProfile): string[] {
  const genres = [...(intent.genre ?? [])];
  if (!genres.length && profile.preferred_genres.length) {
    genres.push(...profile.preferred_genres);
  }
  return [...new Set(genres.map(normalize))];
}

function computeGenreComponent(
  song: Song,
  targetGenres: string[],
  profile: TasteProfile,
): { score: number; match?: string } {
  const songGenre = normalize(song.genre);
  const intentMatch = targetGenres.find((g) => normalize(g) === songGenre);
  if (intentMatch) {
    return { score: 1, match: song.genre };
  }
  const profileMatch = profile.preferred_genres.find((g) => normalize(g) === songGenre);
  if (profileMatch) {
    return { score: 0.6, match: profileMatch };
  }
  return { score: 0 };
}

function computeMoodComponent(song: Song, targetMoods: string[]): { score: number; match?: string } {
  if (!targetMoods.length) return { score: 0 };
  const songMoods = song.mood.map(normalize);
  const overlap = targetMoods.filter((m) => songMoods.includes(normalize(m)));
  if (!overlap.length) return { score: 0 };
  const match = arraysOverlap(song.mood, overlap) ?? overlap[0];
  return { score: Math.min(1, overlap.length / targetMoods.length), match };
}

function computeArtistComponent(
  song: Song,
  artist: Artist | null,
  intent: DiscoveryIntent,
  profile: TasteProfile,
  seedArtistRecord: Artist | null,
  similarArtistIds: Set<string>,
): { score: number; match?: string } {
  if (!artist) return { score: 0 };

  const artistName = normalize(artist.name);

  if (intent.seedArtist && normalize(intent.seedArtist) === artistName) {
    return { score: 1, match: artist.name };
  }

  if (seedArtistRecord && similarArtistIds.has(song.artist_id)) {
    return { score: 0.85, match: artist.name };
  }

  if (seedArtistRecord) {
    const similarNames = seedArtistRecord.similar_artists.map(normalize);
    if (similarNames.includes(artistName)) {
      return { score: 0.75, match: artist.name };
    }
  }

  const favorite = profile.favorite_artists.find((a) => normalize(a) === artistName);
  if (favorite) {
    return { score: 0.7, match: favorite };
  }

  return { score: 0 };
}

function computeProfileGenreBoost(song: Song, profile: TasteProfile): number {
  if (!profile.preferred_genres.length) return 0;
  return profile.preferred_genres.some((g) => normalize(g) === normalize(song.genre)) ? 1 : 0;
}

function computeProfileArtistBoost(artist: Artist | null, profile: TasteProfile): number {
  if (!artist || !profile.favorite_artists.length) return 0;
  return profile.favorite_artists.some((a) => normalize(a) === normalize(artist.name)) ? 1 : 0;
}

export function computePersonalScore(
  song: Song,
  artist: Artist | null,
  intent: DiscoveryIntent,
  profile: TasteProfile,
  seedArtistRecord: Artist | null,
  similarArtistIds: Set<string>,
): { score: number; signals: Pick<MatchedSignals, "genreMatch" | "moodMatch" | "artistMatch"> } {
  const targetGenres = resolveTargetGenres(intent, profile);
  const targetMoods = resolveTargetMoods(intent);

  const genre = computeGenreComponent(song, targetGenres, profile);
  const mood = computeMoodComponent(song, targetMoods);
  const artistMatch = computeArtistComponent(
    song,
    artist,
    intent,
    profile,
    seedArtistRecord,
    similarArtistIds,
  );
  const profileGenre = computeProfileGenreBoost(song, profile);
  const profileArtist = computeProfileArtistBoost(artist, profile);

  const w = PERSONAL_SIGNAL_WEIGHTS;
  const score =
    genre.score * w.genreMatch +
    mood.score * w.moodMatch +
    artistMatch.score * w.artistMatch +
    profileGenre * w.profileGenre +
    profileArtist * w.profileArtist;

  return {
    score: roundScore(score),
    signals: {
      genreMatch: genre.match,
      moodMatch: mood.match,
      artistMatch: artistMatch.match,
    },
  };
}

export function computeCulturalScore(song: Song): {
  score: number;
  signals: Pick<
    MatchedSignals,
    "isHiddenGem" | "isEmergingArtist" | "communityBuzzScore" | "inversePopularity"
  >;
} {
  const popularity = Math.max(0, Math.min(100, song.popularity));
  const inversePopularity = (100 - popularity) / 100;
  const buzz = Math.max(0, Math.min(1, Number(song.community_buzz_score)));

  const w = CULTURAL_SIGNAL_WEIGHTS;
  const score =
    (song.hidden_gem_flag ? 1 : 0) * w.hiddenGem +
    (song.emerging_artist_flag ? 1 : 0) * w.emerging +
    buzz * w.communityBuzz +
    inversePopularity * w.inversePopularity;

  return {
    score: roundScore(score),
    signals: {
      isHiddenGem: song.hidden_gem_flag,
      isEmergingArtist: song.emerging_artist_flag,
      communityBuzzScore: buzz,
      inversePopularity: roundScore(inversePopularity),
    },
  };
}

export function computeFinalScore(
  personalScore: number,
  culturalScore: number,
  explorationLevel: DiscoveryIntent["explorationLevel"],
): number {
  const weights = getScoreWeights(explorationLevel);
  return roundScore(personalScore * weights.personal + culturalScore * weights.cultural);
}

export function scoreSong(
  song: Song,
  artist: Artist | null,
  intent: DiscoveryIntent,
  profile: TasteProfile,
  seedArtistRecord: Artist | null,
  similarArtistIds: Set<string>,
): ScoredSong {
  const personal = computePersonalScore(
    song,
    artist,
    intent,
    profile,
    seedArtistRecord,
    similarArtistIds,
  );
  const cultural = computeCulturalScore(song);

  let personalScore = personal.score;
  let culturalScore = cultural.score;

  // general_discovery with no personal signals → lean on cultural ranking (P3-07)
  const hasPersonalSignals =
    Boolean(intent.genre?.length) ||
    Boolean(intent.mood?.length) ||
    Boolean(intent.seedArtist) ||
    Boolean(intent.activity) ||
    profile.preferred_genres.length > 0 ||
    profile.favorite_artists.length > 0;

  if (!hasPersonalSignals || intent.intent === "trending") {
    if (intent.intent === "trending") {
      culturalScore = roundScore(
        culturalScore * 0.6 + (song.community_buzz_score * 0.25 + song.popularity / 100 * 0.15),
      );
    } else {
      personalScore = roundScore(personalScore * 0.3);
      culturalScore = roundScore(culturalScore * 1.1);
    }
  }

  const finalScore = computeFinalScore(personalScore, culturalScore, intent.explorationLevel);

  return {
    personalScore,
    culturalScore,
    finalScore,
    matchedSignals: {
      ...personal.signals,
      ...cultural.signals,
    },
  };
}

export function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

import type { DiscoveryIntent } from "@/lib/intent/schema";
import type { TasteProfile } from "@/types";
import type { SongWithArtist } from "@/types";
import { SCORING_CONFIG } from "@/lib/scoring/config";

export type CandidateFilterStage =
  | "genre_and_mood"
  | "genre_only"
  | "mood_only"
  | "seed_artist"
  | "profile_genres"
  | "all_songs";

export interface CandidateQueryPlan {
  stages: CandidateFilterStage[];
  genres: string[];
  moods: string[];
  seedArtist?: string;
}

function uniqueNormalized(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean))];
}

export function buildCandidateQueryPlan(
  intent: DiscoveryIntent,
  profile: TasteProfile,
): CandidateQueryPlan {
  const genres = uniqueNormalized([
    ...(intent.genre ?? []),
    ...(intent.genre?.length ? [] : profile.preferred_genres),
  ]);
  const moods = uniqueNormalized(intent.mood ?? []);

  const stages: CandidateFilterStage[] = [];

  if (genres.length && moods.length) stages.push("genre_and_mood");
  if (genres.length) stages.push("genre_only");
  if (moods.length) stages.push("mood_only");
  if (intent.seedArtist) stages.push("seed_artist");
  if (profile.preferred_genres.length && !genres.length) stages.push("profile_genres");
  stages.push("all_songs");

  return {
    stages: [...new Set(stages)],
    genres,
    moods,
    seedArtist: intent.seedArtist,
  };
}

export function mergeCandidates(...lists: SongWithArtist[][]): SongWithArtist[] {
  const map = new Map<string, SongWithArtist>();
  for (const list of lists) {
    for (const song of list) {
      map.set(song.id, song);
    }
  }
  return [...map.values()];
}

export function hasEnoughCandidates(count: number): boolean {
  return count >= SCORING_CONFIG.minPoolBeforeRelax;
}

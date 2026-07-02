import "server-only";

import type { DiscoveryIntent } from "@/lib/intent/schema";
import type { TasteProfile } from "@/types";
import type { SongWithArtist } from "@/types";
import { getSimilarArtists } from "@/lib/data/artists";
import {
  getAllSongs,
  getSongsByArtistIds,
  getSongsByArtistName,
  getSongsByFilters,
} from "@/lib/data/songs";
import {
  buildCandidateQueryPlan,
  hasEnoughCandidates,
  mergeCandidates,
} from "@/lib/scoring/fallback";
import { rankSongs, type RankResult } from "@/lib/scoring/rank";
import { SCORING_CONFIG } from "@/lib/scoring/config";
import type { Artist } from "@/types";

export interface RecommendInput {
  intent: DiscoveryIntent;
  profile: TasteProfile;
  limit?: number;
  excludeSongIds?: string[];
}

async function gatherCandidates(
  intent: DiscoveryIntent,
  profile: TasteProfile,
): Promise<{ songs: SongWithArtist[]; seedArtistRecord: Artist | null; similarArtistIds: Set<string> }> {
  const plan = buildCandidateQueryPlan(intent, profile);
  let pool: SongWithArtist[] = [];
  let seedArtistRecord: Artist | null = null;
  const similarArtistIds = new Set<string>();

  for (const stage of plan.stages) {
    if (hasEnoughCandidates(pool.length)) break;

    switch (stage) {
      case "genre_and_mood": {
        for (const genre of plan.genres) {
          for (const mood of plan.moods) {
            const batch = await getSongsByFilters({ genre, mood, limit: 40 });
            pool = mergeCandidates(pool, batch);
          }
        }
        break;
      }
      case "genre_only": {
        for (const genre of plan.genres) {
          const batch = await getSongsByFilters({ genre, limit: 50 });
          pool = mergeCandidates(pool, batch);
        }
        break;
      }
      case "mood_only": {
        for (const mood of plan.moods) {
          const batch = await getSongsByFilters({ mood, limit: 50 });
          pool = mergeCandidates(pool, batch);
        }
        break;
      }
      case "seed_artist": {
        if (!plan.seedArtist) break;
        const seedSongs = await getSongsByArtistName(plan.seedArtist, 30);
        pool = mergeCandidates(pool, seedSongs);

        const similar = await getSimilarArtists(plan.seedArtist);
        if (similar.length) {
          similar.forEach((a) => similarArtistIds.add(a.id));
          const similarSongs = await getSongsByArtistIds(
            similar.map((a) => a.id),
            50,
          );
          pool = mergeCandidates(pool, similarSongs);
        }

        const supabaseArtist = seedSongs[0]?.artists;
        if (supabaseArtist) {
          seedArtistRecord = supabaseArtist;
        } else if (similar.length) {
          seedArtistRecord = similar[0] ?? null;
        }
        break;
      }
      case "profile_genres": {
        for (const genre of profile.preferred_genres) {
          const batch = await getSongsByFilters({ genre, limit: 40 });
          pool = mergeCandidates(pool, batch);
        }
        break;
      }
      case "all_songs": {
        const batch = await getAllSongs(SCORING_CONFIG.maxCandidatePool);
        pool = mergeCandidates(pool, batch);
        break;
      }
    }
  }

  return { songs: pool, seedArtistRecord, similarArtistIds };
}

export async function recommendSongs(input: RecommendInput): Promise<RankResult> {
  const { songs, seedArtistRecord, similarArtistIds } = await gatherCandidates(
    input.intent,
    input.profile,
  );

  const exclude = new Set(input.excludeSongIds ?? []);
  const filtered = exclude.size ? songs.filter((s) => !exclude.has(s.id)) : songs;

  return rankSongs(filtered, input.intent, input.profile, {
    limit: input.limit,
    seedArtistRecord,
    similarArtistIds,
  });
}

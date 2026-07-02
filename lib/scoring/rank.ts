import type { RecommendationCandidate } from "@/types";
import type { SongWithArtist } from "@/types";
import type { DiscoveryIntent } from "@/lib/intent/schema";
import type { TasteProfile } from "@/types";
import { SCORING_CONFIG } from "@/lib/scoring/config";
import { scoreSong, type ScoredSong } from "@/lib/scoring/scores";
import type { Artist } from "@/types";

export interface RankOptions {
  limit?: number;
  seedArtistRecord?: Artist | null;
  similarArtistIds?: Set<string>;
}

export interface RankResult {
  candidates: RecommendationCandidate[];
  partial: boolean;
}

function compareCandidates(a: RecommendationCandidate, b: RecommendationCandidate): number {
  if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
  if (b.matchedSignals.communityBuzzScore !== a.matchedSignals.communityBuzzScore) {
    return b.matchedSignals.communityBuzzScore - a.matchedSignals.communityBuzzScore;
  }
  return a.song.song_name.localeCompare(b.song.song_name);
}

export function rankSongs(
  songs: SongWithArtist[],
  intent: DiscoveryIntent,
  profile: TasteProfile,
  options: RankOptions = {},
): RankResult {
  const limit = Math.min(
    options.limit ?? SCORING_CONFIG.defaultLimit,
    SCORING_CONFIG.maxLimit,
  );
  const seedArtistRecord = options.seedArtistRecord ?? null;
  const similarArtistIds = options.similarArtistIds ?? new Set<string>();

  const scored = new Map<string, ScoredSong & { song: SongWithArtist }>();

  for (const entry of songs) {
    const artist = entry.artists ?? null;
    const result = scoreSong(
      entry,
      artist,
      intent,
      profile,
      seedArtistRecord,
      similarArtistIds,
    );
    scored.set(entry.id, { ...result, song: entry });
  }

  const ranked: RecommendationCandidate[] = [...scored.values()]
    .map(({ song, personalScore, culturalScore, finalScore, matchedSignals }) => ({
      song: {
        id: song.id,
        song_name: song.song_name,
        artist_id: song.artist_id,
        genre: song.genre,
        mood: song.mood,
        popularity: song.popularity,
        emerging_artist_flag: song.emerging_artist_flag,
        hidden_gem_flag: song.hidden_gem_flag,
        community_buzz_score: song.community_buzz_score,
        album_art_url: song.album_art_url,
        audio_preview_url: song.audio_preview_url,
      },
      artist: song.artists ?? {
        id: song.artist_id,
        name: "Unknown Artist",
        genres: [],
        similar_artists: [],
        bio: null,
      },
      personalScore,
      culturalScore,
      finalScore,
      matchedSignals,
    }))
    .sort(compareCandidates)
    .slice(0, limit);

  const partial =
    ranked.length < Math.min(SCORING_CONFIG.minDesiredResults, limit) && ranked.length > 0;

  return { candidates: ranked, partial };
}

export function averageCulturalScore(candidates: RecommendationCandidate[]): number {
  if (!candidates.length) return 0;
  const sum = candidates.reduce((acc, c) => acc + c.culturalScore, 0);
  return Math.round((sum / candidates.length) * 1000) / 1000;
}

export function countDiscoveryFlags(candidates: RecommendationCandidate[]): {
  hiddenGems: number;
  emerging: number;
} {
  return candidates.reduce(
    (acc, c) => ({
      hiddenGems: acc.hiddenGems + (c.matchedSignals.isHiddenGem ? 1 : 0),
      emerging: acc.emerging + (c.matchedSignals.isEmergingArtist ? 1 : 0),
    }),
    { hiddenGems: 0, emerging: 0 },
  );
}

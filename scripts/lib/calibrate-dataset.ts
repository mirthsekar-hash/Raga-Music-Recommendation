import type { SeedConfig, SongSeed } from "../schemas/seed";
import { clamp } from "./utils";
import { computeHiddenGemFlag, computeCommunityBuzzScore } from "./derive-signals";

export function capHiddenGemMix(songs: SongSeed[], maxPct: number): SongSeed[] {
  const max = Math.round(songs.length * maxPct);
  const hidden = songs.filter((s) => s.hidden_gem_flag);
  if (hidden.length <= max) return songs;

  const toDemote = hidden
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, hidden.length - max);
  const demoteIds = new Set(toDemote.map((s) => s.id));

  return songs.map((s) =>
    demoteIds.has(s.id) ? { ...s, hidden_gem_flag: false } : s,
  );
}

export function enforceDiscoveryMix(songs: SongSeed[], config: SeedConfig): SongSeed[] {
  const targetHidden = Math.round(songs.length * config.discoveryMix.hiddenGemTargetPct);
  const currentHidden = songs.filter((s) => s.hidden_gem_flag).length;

  if (currentHidden >= targetHidden * 0.8) return songs;

  const borderline = songs
    .filter((s) => !s.hidden_gem_flag && s.popularity < 50)
    .sort((a, b) => a.popularity - b.popularity);

  const needed = targetHidden - currentHidden;
  const boosted = new Set(borderline.slice(0, needed).map((s) => s.id));

  return songs.map((s) =>
    boosted.has(s.id)
      ? {
          ...s,
          hidden_gem_flag: true,
          community_buzz_score: Math.max(s.community_buzz_score, 0.58),
        }
      : s,
  );
}

/** Spread popularity across a demo-friendly range while preserving relative order. */
export function calibratePopularity(songs: SongSeed[]): SongSeed[] {
  const sorted = [...songs].sort((a, b) => a.popularity - b.popularity);
  const rankMap = new Map(sorted.map((s, i) => [s.id, i]));

  return songs.map((song) => {
    const rank = rankMap.get(song.id) ?? 0;
    const calibratedPop =
      sorted.length <= 1
        ? 50
        : Math.round(8 + (rank / (sorted.length - 1)) * 84);

    const communityBuzzScore = computeCommunityBuzzScore({
      recordingTagCount: Math.round(song.community_buzz_score * 12),
      genre: song.genre,
      releaseYear: undefined,
      popularity: calibratedPop,
      tagCountScore: calibratedPop,
    });

    const hiddenGemFlag = computeHiddenGemFlag({
      popularity: calibratedPop,
      communityBuzzScore,
      releaseRecencyScore: 45,
      tagCountScore: calibratedPop,
      forceHiddenGem: song.hidden_gem_flag,
    });

    return {
      ...song,
      popularity: calibratedPop,
      community_buzz_score: Math.round(communityBuzzScore * 1000) / 1000,
      hidden_gem_flag: hiddenGemFlag,
    };
  });
}

export function capEmergingMix(songs: SongSeed[], maxPct: number): SongSeed[] {
  const max = Math.round(songs.length * maxPct);
  const emerging = songs.filter((s) => s.emerging_artist_flag);
  if (emerging.length <= max) return songs;

  const toDemote = emerging
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, emerging.length - max);
  const demoteIds = new Set(toDemote.map((s) => s.id));

  return songs.map((s) =>
    demoteIds.has(s.id) ? { ...s, emerging_artist_flag: false } : s,
  );
}

export function enforceEmergingMix(songs: SongSeed[], targetPct: number): SongSeed[] {
  const target = Math.round(songs.length * targetPct);
  const current = songs.filter((s) => s.emerging_artist_flag).length;
  if (current >= target * 0.8) return songs;

  const needed = target - current;
  const candidates = songs
    .filter((s) => !s.emerging_artist_flag && s.popularity < 60)
    .sort((a, b) => a.popularity - b.popularity)
    .slice(0, needed);

  const boostIds = new Set(candidates.map((s) => s.id));
  return songs.map((s) => (boostIds.has(s.id) ? { ...s, emerging_artist_flag: true } : s));
}

export function spreadBuzzScores(songs: SongSeed[]): SongSeed[] {
  const sorted = [...songs].sort((a, b) => a.community_buzz_score - b.community_buzz_score);
  return songs.map((song) => {
    const rank = sorted.findIndex((s) => s.id === song.id);
    const buzz =
      sorted.length <= 1 ? 0.5 : clamp(0.21 + (rank / (sorted.length - 1)) * 0.68, 0, 1);
    return { ...song, community_buzz_score: Math.round(buzz * 1000) / 1000 };
  });
}

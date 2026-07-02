import type { Song } from "@/types";

/** Buzz threshold aligned with explain fallback trending copy. */
export const TRENDING_BUZZ_THRESHOLD = 0.72;

const TRENDING_POPULARITY_FLOOR = 55;
const TRENDING_BUZZ_WITH_POPULARITY = 0.65;

/**
 * Trending = strong community buzz without the hidden-gem niche profile.
 * Derived from existing `community_buzz_score` + `popularity` — no extra DB column.
 */
export function computeIsTrending(
  song: Pick<Song, "hidden_gem_flag" | "popularity">,
  communityBuzzScore: number,
): boolean {
  if (song.hidden_gem_flag) return false;

  const buzz = Math.max(0, Math.min(1, Number(communityBuzzScore)));

  return (
    buzz >= TRENDING_BUZZ_THRESHOLD ||
    (buzz >= TRENDING_BUZZ_WITH_POPULARITY && song.popularity >= TRENDING_POPULARITY_FLOOR)
  );
}

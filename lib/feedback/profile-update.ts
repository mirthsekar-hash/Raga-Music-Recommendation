import type { ExplorationLevel } from "@/lib/intent/schema";
import type { DiscoveryIntent } from "@/lib/intent/schema";
import type { Artist, Song, TasteProfile } from "@/types";
import type { FeedbackAction } from "@/types";

export const MAX_PREFERENCE_ITEMS = 20;

function prependUnique(list: string[], value: string): string[] {
  const normalized = value.trim();
  if (!normalized) return list;
  const lower = normalized.toLowerCase();
  const filtered = list.filter((item) => item.toLowerCase() !== lower);
  return [normalized, ...filtered].slice(0, MAX_PREFERENCE_ITEMS);
}

function removeItem(list: string[], value: string): string[] {
  const lower = value.toLowerCase();
  return list.filter((item) => item.toLowerCase() !== lower);
}

function nudgeExploration(
  current: ExplorationLevel,
  song: Song,
): ExplorationLevel {
  if (song.hidden_gem_flag || song.emerging_artist_flag) {
    return "adventurous";
  }
  if (current === "conservative") return "balanced";
  return current;
}

export function applyFeedbackToProfile(
  profile: TasteProfile,
  song: Song,
  artist: Artist,
  action: FeedbackAction,
): TasteProfile {
  let preferred_genres = [...profile.preferred_genres];
  let favorite_artists = [...profile.favorite_artists];
  let mood_history = Array.isArray(profile.mood_history)
    ? [...(profile.mood_history as string[])]
    : [];
  let exploration_level = profile.exploration_level;

  if (action === "love" || action === "more_like_this") {
    preferred_genres = prependUnique(preferred_genres, song.genre);
    favorite_artists = prependUnique(favorite_artists, artist.name);
    for (const mood of song.mood) {
      if (!mood_history.includes(mood)) mood_history.push(mood);
    }
    mood_history = mood_history.slice(-MAX_PREFERENCE_ITEMS);
    exploration_level = nudgeExploration(exploration_level, song);
  } else if (action === "skip") {
    preferred_genres = removeItem(preferred_genres, song.genre);
    favorite_artists = removeItem(favorite_artists, artist.name);
  }

  return {
    ...profile,
    preferred_genres,
    favorite_artists,
    mood_history,
    exploration_level,
    updated_at: new Date().toISOString(),
  };
}

export function buildMoreLikeThisIntent(
  song: Song,
  artist: Artist,
  profile: TasteProfile,
): DiscoveryIntent {
  return {
    intent: "similar_to",
    seedArtist: artist.name,
    genre: [song.genre],
    mood: song.mood.length ? song.mood.slice(0, 4) : undefined,
    explorationLevel: profile.exploration_level,
  };
}

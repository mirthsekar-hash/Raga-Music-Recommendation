import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { FeedbackAction } from "@/types";
import type { TasteProfile } from "@/types";
import { defaultTasteProfile } from "@/lib/data/profile-default";
import { applyFeedbackToProfile } from "@/lib/feedback/profile-update";
import type { Artist, Song } from "@/types";

export { defaultTasteProfile } from "@/lib/data/profile-default";

export async function getTasteProfile(sessionId: string): Promise<TasteProfile | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_taste_profile")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as TasteProfile | null;
}

export async function getOrDefaultProfile(sessionId: string): Promise<TasteProfile> {
  const profile = await getTasteProfile(sessionId);
  return profile ?? defaultTasteProfile(sessionId);
}

export async function ensureTasteProfile(sessionId: string): Promise<TasteProfile> {
  const existing = await getTasteProfile(sessionId);
  if (existing) return existing;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_taste_profile")
    .insert({
      session_id: sessionId,
      preferred_genres: [],
      favorite_artists: [],
      mood_history: [],
      exploration_level: "balanced",
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create taste profile");
  }

  return data as TasteProfile;
}

export async function saveTasteProfile(profile: TasteProfile): Promise<TasteProfile> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_taste_profile")
    .update({
      preferred_genres: profile.preferred_genres,
      favorite_artists: profile.favorite_artists,
      mood_history: profile.mood_history,
      exploration_level: profile.exploration_level,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", profile.session_id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update taste profile");
  }

  return data as TasteProfile;
}

export async function updateProfileFromFeedback(
  sessionId: string,
  song: Song,
  artist: Artist,
  action: FeedbackAction,
): Promise<TasteProfile> {
  const profile = await ensureTasteProfile(sessionId);
  const updated = applyFeedbackToProfile(profile, song, artist, action);
  return saveTasteProfile(updated);
}

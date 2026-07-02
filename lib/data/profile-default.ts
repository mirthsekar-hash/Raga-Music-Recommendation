import type { TasteProfile } from "@/types";

export function defaultTasteProfile(sessionId: string): TasteProfile {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    session_id: sessionId,
    preferred_genres: [],
    favorite_artists: [],
    mood_history: [],
    exploration_level: "balanced",
    updated_at: new Date().toISOString(),
  };
}

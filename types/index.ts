import type { DiscoveryIntent } from "@/lib/intent/schema";

export type HealthStatus = "ok" | "error";

export interface HealthCheckResponse {
  supabase: HealthStatus;
  gemini: HealthStatus;
  message?: string;
}

export const SUGGESTED_PROMPTS = [
  "Recommend music for a late-night drive",
  "Suggest underrated indie artists",
  "Give me hidden gems similar to Coldplay",
  "I want something energetic for a workout",
  "Recommend songs trending in indie communities",
] as const;

export interface Artist {
  id: string;
  name: string;
  genres: string[];
  similar_artists: string[];
  bio: string | null;
  created_at?: string;
}

export interface Song {
  id: string;
  song_name: string;
  artist_id: string;
  genre: string;
  mood: string[];
  popularity: number;
  emerging_artist_flag: boolean;
  hidden_gem_flag: boolean;
  community_buzz_score: number;
  album_art_url: string | null;
  audio_preview_url: string | null;
  created_at?: string;
}

export interface SongWithArtist extends Song {
  artists: Artist | null;
}

export interface TasteProfile {
  id: string;
  session_id: string;
  preferred_genres: string[];
  favorite_artists: string[];
  mood_history: unknown[];
  exploration_level: "conservative" | "balanced" | "adventurous";
  updated_at: string;
}

export type FeedbackAction = "love" | "skip" | "more_like_this";

export interface Feedback {
  id: string;
  session_id: string;
  song_id: string;
  action: FeedbackAction;
  created_at: string;
}

export interface SongFilters {
  genre?: string;
  mood?: string;
  hiddenGem?: boolean;
  emerging?: boolean;
  maxPopularity?: number;
  limit?: number;
}

export interface MatchedSignals {
  genreMatch?: string;
  moodMatch?: string;
  artistMatch?: string;
  isHiddenGem: boolean;
  isEmergingArtist: boolean;
  communityBuzzScore: number;
  inversePopularity: number;
}

export interface RecommendationCandidate {
  song: Song;
  artist: Artist;
  personalScore: number;
  culturalScore: number;
  finalScore: number;
  matchedSignals: MatchedSignals;
}

export interface RecommendResponse {
  sessionId?: string;
  candidates: RecommendationCandidate[];
  count: number;
  partial?: boolean;
}

export interface RecommendationExplanation {
  songId: string;
  whyYoullLikeIt: string;
  whyInteresting: string;
  discoverySource: string;
  explorationPath: string[];
}

export interface RecommendationCard {
  candidate: RecommendationCandidate;
  explanation: RecommendationExplanation;
}

export interface ChatResponse {
  sessionId: string;
  chatReply: string;
  clarifyingQuestion?: string;
  intent: DiscoveryIntent;
  cards: RecommendationCard[];
  partial?: boolean;
  explanationsFromTemplate?: boolean;
}

export type {
  ExplorationLevel,
  IntentExtraction,
  IntentRequest,
  IntentResponse,
  IntentType,
} from "@/lib/intent/schema";
export type { DiscoveryIntent } from "@/lib/intent/schema";

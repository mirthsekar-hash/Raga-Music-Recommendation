import { z } from "zod";
import { DiscoveryIntentSchema } from "@/lib/intent/schema";

export const RecommendRequestSchema = z.object({
  intent: DiscoveryIntentSchema,
  sessionId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(8).optional(),
  excludeSongIds: z.array(z.string().uuid()).max(50).optional(),
});

export const MatchedSignalsSchema = z.object({
  genreMatch: z.string().optional(),
  moodMatch: z.string().optional(),
  artistMatch: z.string().optional(),
  isHiddenGem: z.boolean(),
  isEmergingArtist: z.boolean(),
  communityBuzzScore: z.number(),
  inversePopularity: z.number(),
});

export const RecommendationCandidateSchema = z.object({
  song: z.object({
    id: z.string().uuid(),
    song_name: z.string(),
    artist_id: z.string().uuid(),
    genre: z.string(),
    mood: z.array(z.string()),
    popularity: z.number(),
    emerging_artist_flag: z.boolean(),
    hidden_gem_flag: z.boolean(),
    community_buzz_score: z.number(),
    album_art_url: z.string().nullable(),
    audio_preview_url: z.string().nullable(),
  }),
  artist: z.object({
    id: z.string().uuid(),
    name: z.string(),
    genres: z.array(z.string()),
    similar_artists: z.array(z.string()),
    bio: z.string().nullable(),
  }),
  personalScore: z.number(),
  culturalScore: z.number(),
  finalScore: z.number(),
  matchedSignals: MatchedSignalsSchema,
});

export const RecommendResponseSchema = z.object({
  sessionId: z.string().uuid().optional(),
  candidates: z.array(RecommendationCandidateSchema),
  count: z.number(),
  partial: z.boolean().optional(),
});

export type RecommendRequest = z.infer<typeof RecommendRequestSchema>;
export type RecommendResponse = z.infer<typeof RecommendResponseSchema>;

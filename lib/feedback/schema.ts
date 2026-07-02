import { z } from "zod";

export const FeedbackActionSchema = z.enum(["love", "skip", "more_like_this"]);

export const FeedbackRequestSchema = z.object({
  sessionId: z.string().uuid(),
  songId: z.string().uuid(),
  action: FeedbackActionSchema,
  excludeSongIds: z.array(z.string().uuid()).max(50).optional(),
});

export const FeedbackAnalyticsSchema = z.object({
  love: z.number(),
  skip: z.number(),
  more_like_this: z.number(),
  total: z.number(),
});

export const FeedbackResponseSchema = z.object({
  ok: z.literal(true),
  action: FeedbackActionSchema,
  songId: z.string().uuid(),
  profile: z.object({
    preferred_genres: z.array(z.string()),
    favorite_artists: z.array(z.string()),
    exploration_level: z.enum(["conservative", "balanced", "adventurous"]),
  }),
  analytics: FeedbackAnalyticsSchema,
  followUp: z
    .object({
      chatReply: z.string(),
      cards: z.array(z.unknown()),
      intent: z.unknown().optional(),
    })
    .optional(),
});

export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>;

import { z } from "zod";

export const IntentTypeSchema = z.enum([
  "similar_to",
  "mood_based",
  "activity_based",
  "trending",
  "general_discovery",
]);

export const ExplorationLevelSchema = z.enum([
  "conservative",
  "balanced",
  "adventurous",
]);

export const DiscoveryIntentSchema = z.object({
  mood: z.array(z.string().min(1)).optional(),
  activity: z.string().min(1).optional(),
  genre: z.array(z.string().min(1)).optional(),
  seedArtist: z.string().min(1).optional(),
  intent: IntentTypeSchema,
  explorationLevel: ExplorationLevelSchema,
});

export const IntentExtractionSchema = DiscoveryIntentSchema.extend({
  clarifyingQuestion: z.string().min(1).optional(),
});

export const ChatHistoryTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const IntentRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000, "Message too long (max 2000 chars)"),
  sessionId: z.string().uuid().optional(),
  history: z.array(ChatHistoryTurnSchema).optional(),
});

export const IntentResponseSchema = z.object({
  sessionId: z.string().uuid(),
  intent: DiscoveryIntentSchema,
  clarifyingQuestion: z.string().optional(),
});

export type IntentType = z.infer<typeof IntentTypeSchema>;
export type ExplorationLevel = z.infer<typeof ExplorationLevelSchema>;
export type DiscoveryIntent = z.infer<typeof DiscoveryIntentSchema>;
export type IntentExtraction = z.infer<typeof IntentExtractionSchema>;
export type IntentRequest = z.infer<typeof IntentRequestSchema>;
export type IntentResponse = z.infer<typeof IntentResponseSchema>;
export type ChatHistoryTurn = z.infer<typeof ChatHistoryTurnSchema>;

export const FALLBACK_INTENT: DiscoveryIntent = {
  intent: "general_discovery",
  explorationLevel: "balanced",
};

export const VAGUE_INPUT_CLARIFYING_QUESTION =
  "What kind of music are you in the mood for — a genre, activity, or artist to explore from?";

import { z } from "zod";
import { DiscoveryIntentSchema } from "@/lib/intent/schema";
import { RecommendationCandidateSchema } from "@/lib/scoring/schema";

const MAX_EXPLANATION_CHARS = 500;
const MAX_CARD_SNIPPET_CHARS = 280;

export const RecommendationExplanationSchema = z.object({
  songId: z.string().uuid(),
  whyYoullLikeIt: z.string().min(1).max(MAX_EXPLANATION_CHARS),
  whyInteresting: z.string().min(1).max(MAX_EXPLANATION_CHARS),
  discoverySource: z.string().min(1).max(MAX_EXPLANATION_CHARS),
  explorationPath: z.array(z.string().min(1)).max(6),
});

export const ExplainBatchSchema = z.object({
  chatReply: z.string().min(1).max(MAX_EXPLANATION_CHARS).optional(),
  explanations: z.array(RecommendationExplanationSchema),
});

export const ExplainRequestSchema = z.object({
  intent: DiscoveryIntentSchema,
  candidates: z.array(RecommendationCandidateSchema).min(1).max(8),
  includeChatReply: z.boolean().optional(),
  userMessage: z.string().max(2000).optional(),
});

export const ExplainResponseSchema = z.object({
  chatReply: z.string().optional(),
  explanations: z.array(RecommendationExplanationSchema),
  usedTemplateFallback: z.boolean().optional(),
});

export const RecommendationCardSchema = z.object({
  candidate: RecommendationCandidateSchema,
  explanation: RecommendationExplanationSchema,
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message is required").max(2000, "Message too long (max 2000 chars)"),
  sessionId: z.string().uuid().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .optional(),
});

export const ChatResponseSchema = z.object({
  sessionId: z.string().uuid(),
  chatReply: z.string(),
  clarifyingQuestion: z.string().optional(),
  intent: DiscoveryIntentSchema,
  cards: z.array(RecommendationCardSchema),
  partial: z.boolean().optional(),
  explanationsFromTemplate: z.boolean().optional(),
});

export type RecommendationExplanation = z.infer<typeof RecommendationExplanationSchema>;
export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;
export type ExplainResponse = z.infer<typeof ExplainResponseSchema>;
export type RecommendationCard = z.infer<typeof RecommendationCardSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export function truncateForCard(text: string, max = MAX_CARD_SNIPPET_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export { MAX_EXPLANATION_CHARS, MAX_CARD_SNIPPET_CHARS };

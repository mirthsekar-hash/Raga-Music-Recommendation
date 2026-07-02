import { generateWithQuota, GeminiQuotaExceededError, GeminiCircuitOpenError } from "@/lib/gemini/generate";
import { GEMINI_MVP_BUDGET } from "@/lib/gemini/config";
import {
  templateExplainBatch,
  templateExplanation,
} from "@/lib/explain/fallback";
import {
  buildExplainPrompt,
  EXPLAIN_SYSTEM_INSTRUCTION,
} from "@/lib/explain/prompt";
import {
  ExplainBatchSchema,
  truncateForCard,
  type RecommendationExplanation,
} from "@/lib/explain/schema";
import type { DiscoveryIntent } from "@/lib/intent/schema";
import type { RecommendationCandidate } from "@/types";

export interface GenerateExplanationsInput {
  intent: DiscoveryIntent;
  candidates: RecommendationCandidate[];
  includeChatReply?: boolean;
  userMessage?: string;
}

export interface GenerateExplanationsResult {
  chatReply?: string;
  explanations: RecommendationExplanation[];
  usedTemplateFallback: boolean;
}

function parseJsonFromResponse(raw: string): unknown {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

function dedupeCandidates(candidates: RecommendationCandidate[]): RecommendationCandidate[] {
  const map = new Map<string, RecommendationCandidate>();
  for (const candidate of candidates) {
    map.set(candidate.song.id, candidate);
  }
  return [...map.values()].slice(0, 8);
}

function normalizeExplanation(
  raw: RecommendationExplanation,
  candidate: RecommendationCandidate,
  intent: DiscoveryIntent,
): RecommendationExplanation {
  const fallback = templateExplanation(candidate, intent);
  return {
    songId: candidate.song.id,
    whyYoullLikeIt: truncateForCard(raw.whyYoullLikeIt || fallback.whyYoullLikeIt),
    whyInteresting: truncateForCard(raw.whyInteresting || fallback.whyInteresting),
    discoverySource: truncateForCard(raw.discoverySource || fallback.discoverySource),
    explorationPath:
      raw.explorationPath?.length > 0 ? raw.explorationPath.slice(0, 6) : fallback.explorationPath,
  };
}

function mergeExplanations(
  candidates: RecommendationCandidate[],
  intent: DiscoveryIntent,
  rawExplanations: RecommendationExplanation[],
): RecommendationExplanation[] {
  const byId = new Map(rawExplanations.map((e) => [e.songId, e]));

  return candidates.map((candidate) => {
    const raw = byId.get(candidate.song.id);
    if (!raw) return templateExplanation(candidate, intent);
    return normalizeExplanation(raw, candidate, intent);
  });
}

async function callGeminiForExplanations(
  input: GenerateExplanationsInput,
  candidates: RecommendationCandidate[],
): Promise<{ chatReply?: string; explanations: RecommendationExplanation[] }> {
  const prompt = buildExplainPrompt(input.intent, candidates, {
    includeChatReply: input.includeChatReply,
    userMessage: input.userMessage,
  });

  const raw = await generateWithQuota({
    purpose: "explain",
    prompt,
    systemInstruction: EXPLAIN_SYSTEM_INSTRUCTION,
  });

  const parsed = parseJsonFromResponse(raw);
  const batch = ExplainBatchSchema.parse(parsed);

  if (batch.explanations.length === 0 && input.includeChatReply && batch.chatReply) {
    return {
      chatReply: truncateForCard(batch.chatReply),
      explanations: [],
    };
  }

  return {
    chatReply: batch.chatReply ? truncateForCard(batch.chatReply) : undefined,
    explanations: mergeExplanations(candidates, input.intent, batch.explanations),
  };
}

export async function generateExplanations(
  input: GenerateExplanationsInput,
): Promise<GenerateExplanationsResult> {
  const candidates = dedupeCandidates(input.candidates);
  const templates = templateExplainBatch(candidates, input.intent);

  if (!candidates.length) {
    return { explanations: [], usedTemplateFallback: true };
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= GEMINI_MVP_BUDGET.maxJsonRetries; attempt++) {
    try {
      const result = await callGeminiForExplanations(input, candidates);
      return {
        chatReply: result.chatReply ?? templates.chatReply,
        explanations:
          result.explanations.length > 0 ? result.explanations : templates.explanations,
        usedTemplateFallback: false,
      };
    } catch (error) {
      lastError = error;
      if (error instanceof GeminiQuotaExceededError) break;
      if (error instanceof GeminiCircuitOpenError) break;
    }
  }

  console.error("Explanation generation failed, using template fallback:", lastError);

  return {
    chatReply: templates.chatReply,
    explanations: templates.explanations,
    usedTemplateFallback: true,
  };
}

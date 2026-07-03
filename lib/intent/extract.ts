import { generateWithQuota, GeminiQuotaExceededError, GeminiCircuitOpenError } from "@/lib/gemini/generate";
import { GEMINI_MVP_BUDGET } from "@/lib/gemini/config";
import {
  buildIntentCacheKey,
  getCachedIntent,
  setCachedIntent,
} from "@/lib/intent/cache";
import {
  buildIntentPrompt,
  INTENT_SYSTEM_INSTRUCTION,
  isVagueInput,
} from "@/lib/intent/prompt";
import { heuristicExtractIntent } from "@/lib/intent/heuristic";
import { sanitizeUserMessage } from "@/lib/sanitize";
import {
  DiscoveryIntentSchema,
  FALLBACK_INTENT,
  IntentExtractionSchema,
  VAGUE_INPUT_CLARIFYING_QUESTION,
  type ChatHistoryTurn,
  type DiscoveryIntent,
  type IntentExtraction,
} from "@/lib/intent/schema";

export interface ExtractIntentInput {
  message: string;
  history?: ChatHistoryTurn[];
}

export interface ExtractIntentResult {
  intent: DiscoveryIntent;
  clarifyingQuestion?: string;
}

function parseJsonFromResponse(raw: string): unknown {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

async function callGeminiForIntent(
  message: string,
  history?: ChatHistoryTurn[],
): Promise<IntentExtraction> {
  const prompt = buildIntentPrompt(message, history);
  const raw = await generateWithQuota({
    purpose: "intent",
    prompt,
    systemInstruction: INTENT_SYSTEM_INSTRUCTION,
  });
  const parsed = parseJsonFromResponse(raw);
  return IntentExtractionSchema.parse(parsed);
}

export async function extractIntent(
  input: ExtractIntentInput,
): Promise<ExtractIntentResult> {
  const message = sanitizeUserMessage(input.message);
  const { history } = input;

  if (isVagueInput(message)) {
    return {
      intent: { ...FALLBACK_INTENT },
      clarifyingQuestion: VAGUE_INPUT_CLARIFYING_QUESTION,
    };
  }

  const cacheKey = buildIntentCacheKey(message, history);
  const cached = getCachedIntent(cacheKey);
  if (cached) return cached;

  let lastError: unknown;

  for (let attempt = 0; attempt <= GEMINI_MVP_BUDGET.maxJsonRetries; attempt++) {
    try {
      const extraction = await callGeminiForIntent(message, history);
      const { clarifyingQuestion, ...intentFields } = extraction;
      const intent = DiscoveryIntentSchema.parse(intentFields);

      const result = {
        intent,
        clarifyingQuestion,
      };
      setCachedIntent(cacheKey, result);
      return result;
    } catch (error) {
      lastError = error;
      if (error instanceof GeminiQuotaExceededError) break;
      if (error instanceof GeminiCircuitOpenError) break;
    }
  }

  console.error("Intent extraction failed, using heuristic fallback:", lastError);

  const heuristic = heuristicExtractIntent(message);
  const { clarifyingQuestion, ...intentFields } = heuristic;

  const result = {
    intent: DiscoveryIntentSchema.parse(intentFields),
    clarifyingQuestion,
  };
  setCachedIntent(cacheKey, result);
  return result;
}

import "server-only";

import { getOrDefaultProfile } from "@/lib/data/profile";
import { getSkippedSongIds } from "@/lib/data/feedback";
import {
  appendAssistantTurn,
  appendUserTurn,
  createSession,
  getSession,
  historyFromSession,
  type Session,
} from "@/lib/data/sessions";
import { generateExplanations } from "@/lib/explain/generate";
import { noMatchesChatReply } from "@/lib/explain/fallback";
import {
  buildClarifyingChatReply,
  isOffensiveInput,
  SAFE_REFUSAL_REPLY,
} from "@/lib/explain/prompt";
import { isIrrelevantInput, IRRELEVANT_TOPIC_REPLY } from "@/lib/intent/relevance";
import { FALLBACK_INTENT } from "@/lib/intent/schema";
import type { ChatResponse } from "@/lib/explain/schema";
import { GeminiQuotaExceededError } from "@/lib/gemini/generate";
import { extractIntent } from "@/lib/intent/extract";
import { recommendSongs } from "@/lib/scoring/recommend";
import { sanitizeUserMessage } from "@/lib/sanitize";

export type ChatStatusPhase = "understanding" | "recommending" | "explaining";

const STATUS_LABELS: Record<ChatStatusPhase, string> = {
  understanding: "Understanding your request…",
  recommending: "Finding recommendations…",
  explaining: "Writing explanations…",
};

export interface OrchestrateChatInput {
  message: string;
  sessionId?: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

export interface OrchestrateChatResult {
  response: ChatResponse;
  createdSession: boolean;
}

export async function orchestrateChat(
  input: OrchestrateChatInput,
  onStatus?: (phase: ChatStatusPhase, label: string) => void,
): Promise<OrchestrateChatResult> {
  const message = sanitizeUserMessage(input.message);
  if (!message) {
    throw new Error("Message is required");
  }

  if (isOffensiveInput(message)) {
    let sessionId = input.sessionId;
    const createdSession = !sessionId;
    if (!sessionId) {
      sessionId = await createSession();
    }
    return {
      createdSession,
      response: {
        sessionId,
        chatReply: SAFE_REFUSAL_REPLY,
        intent: { intent: "general_discovery", explorationLevel: "balanced" },
        cards: [],
      },
    };
  }

  if (isIrrelevantInput(message)) {
    let sessionId = input.sessionId;
    let createdSession = false;

    if (sessionId) {
      const existing = await getSession(sessionId);
      if (!existing) {
        throw new Error("Session not found");
      }
    } else {
      sessionId = await createSession();
      createdSession = true;
    }

    const fallbackIntent = { ...FALLBACK_INTENT };
    await appendUserTurn(sessionId, message, fallbackIntent);
    await appendAssistantTurn(sessionId, IRRELEVANT_TOPIC_REPLY);

    return {
      createdSession,
      response: {
        sessionId,
        chatReply: IRRELEVANT_TOPIC_REPLY,
        intent: fallbackIntent,
        cards: [],
      },
    };
  }

  let sessionId = input.sessionId;
  let createdSession = false;

  if (sessionId) {
    const existing = await getSession(sessionId);
    if (!existing) {
      throw new Error("Session not found");
    }
  } else {
    sessionId = await createSession();
    createdSession = true;
  }

  const session: Session | null = await getSession(sessionId);
  const history =
    input.history ?? (session ? historyFromSession(session) : undefined);

  onStatus?.("understanding", STATUS_LABELS.understanding);
  const { intent, clarifyingQuestion } = await extractIntent({
    message,
    history,
  });

  await appendUserTurn(sessionId, message, intent);

  if (clarifyingQuestion) {
    const chatReply = buildClarifyingChatReply(clarifyingQuestion);
    await appendAssistantTurn(sessionId, chatReply);

    return {
      createdSession,
      response: {
        sessionId,
        chatReply,
        clarifyingQuestion,
        intent,
        cards: [],
      },
    };
  }

  onStatus?.("recommending", STATUS_LABELS.recommending);
  const profile = await getOrDefaultProfile(sessionId);
  const skippedIds = await getSkippedSongIds(sessionId);
  const { candidates, partial } = await recommendSongs({
    intent,
    profile: { ...profile, exploration_level: intent.explorationLevel },
    excludeSongIds: skippedIds.length ? skippedIds : undefined,
  });

  if (!candidates.length) {
    const chatReply = noMatchesChatReply();
    await appendAssistantTurn(sessionId, chatReply);

    return {
      createdSession,
      response: {
        sessionId,
        chatReply,
        intent,
        cards: [],
      },
    };
  }

  onStatus?.("explaining", STATUS_LABELS.explaining);
  const explained = await generateExplanations({
    intent,
    candidates,
    includeChatReply: true,
    userMessage: message,
  });

  const explanationBySong = new Map(
    explained.explanations.map((e) => [e.songId, e]),
  );

  const cards = candidates
    .map((candidate) => {
      const explanation = explanationBySong.get(candidate.song.id);
      if (!explanation) return null;
      return { candidate, explanation };
    })
    .filter((card): card is NonNullable<typeof card> => card !== null);

  const chatReply = explained.chatReply ?? `Here are ${cards.length} picks for you.`;
  await appendAssistantTurn(sessionId, chatReply);

  return {
    createdSession,
    response: {
      sessionId,
      chatReply,
      intent,
      cards,
      partial: partial || undefined,
      explanationsFromTemplate: explained.usedTemplateFallback || undefined,
    },
  };
}

export { GeminiQuotaExceededError };

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FeedbackAction, RecommendationCard } from "@/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: RecommendationCard[];
  clarifyingQuestion?: string;
  timestamp: string;
}

interface SessionState {
  sessionId: string | null;
  messages: ChatMessage[];
  cardsById: Record<string, RecommendationCard>;
  feedbackBySongId: Record<string, FeedbackAction>;
  setSessionId: (id: string) => void;
  addUserMessage: (content: string) => string;
  addAssistantMessage: (payload: {
    content: string;
    cards?: RecommendationCard[];
    clarifyingQuestion?: string;
  }) => void;
  indexCards: (cards: RecommendationCard[]) => void;
  getCard: (songId: string) => RecommendationCard | undefined;
  setFeedbackAction: (songId: string, action: FeedbackAction) => void;
  clearSession: () => void;
}

function newMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      messages: [],
      cardsById: {},
      feedbackBySongId: {},

      setSessionId: (id) => set({ sessionId: id }),

      addUserMessage: (content) => {
        const id = newMessageId();
        set((state) => ({
          messages: [
            ...state.messages,
            { id, role: "user", content, timestamp: new Date().toISOString() },
          ],
        }));
        return id;
      },

      addAssistantMessage: ({ content, cards, clarifyingQuestion }) => {
        const id = newMessageId();
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id,
              role: "assistant",
              content,
              cards,
              clarifyingQuestion,
              timestamp: new Date().toISOString(),
            },
          ],
        }));
        if (cards?.length) {
          get().indexCards(cards);
        }
      },

      indexCards: (cards) => {
        set((state) => {
          const next = { ...state.cardsById };
          for (const card of cards) {
            next[card.candidate.song.id] = card;
          }
          return { cardsById: next };
        });
      },

      getCard: (songId) => get().cardsById[songId],

      setFeedbackAction: (songId, action) =>
        set((state) => ({
          feedbackBySongId: { ...state.feedbackBySongId, [songId]: action },
        })),

      clearSession: () =>
        set({
          sessionId: null,
          messages: [],
          cardsById: {},
          feedbackBySongId: {},
        }),
    }),
    {
      name: "raga-discovery-session",
      partialize: (state) => ({
        sessionId: state.sessionId,
        messages: state.messages,
        cardsById: state.cardsById,
        feedbackBySongId: state.feedbackBySongId,
      }),
    },
  ),
);

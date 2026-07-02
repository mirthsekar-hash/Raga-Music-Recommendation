"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FeedbackApiError, postFeedback } from "@/lib/api/feedback-client";
import { useSessionStore } from "@/lib/store/session";
import type { FeedbackAction, RecommendationCard } from "@/types";

const DEBOUNCE_MS = 300;

interface FeedbackControlsProps {
  songId: string;
  compact?: boolean;
  excludeSongIds?: string[];
  onAction?: (action: FeedbackAction) => void;
}

export function FeedbackControls({
  songId,
  compact = false,
  excludeSongIds = [],
  onAction,
}: FeedbackControlsProps) {
  const router = useRouter();
  const sessionId = useSessionStore((s) => s.sessionId);
  const feedbackBySongId = useSessionStore((s) => s.feedbackBySongId);
  const setFeedbackAction = useSessionStore((s) => s.setFeedbackAction);
  const addAssistantMessage = useSessionStore((s) => s.addAssistantMessage);

  const [loading, setLoading] = useState<FeedbackAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastClickRef = useRef(0);

  const currentAction = feedbackBySongId[songId];

  const submit = useCallback(
    async (action: FeedbackAction) => {
      const now = Date.now();
      if (now - lastClickRef.current < DEBOUNCE_MS) return;
      if (loading) return;
      if (!sessionId) {
        setError("Start a chat session first.");
        return;
      }
      if (currentAction === action) return;

      lastClickRef.current = now;
      setError(null);
      setLoading(action);

      try {
        const result = await postFeedback(sessionId, songId, action, excludeSongIds);
        setFeedbackAction(songId, action);
        onAction?.(action);

        if (action === "more_like_this" && result.followUp) {
          const cards = result.followUp.cards as RecommendationCard[];
          addAssistantMessage({
            content: result.followUp.chatReply,
            cards: cards.length ? cards : undefined,
          });
          router.replace("/chat");
        }
      } catch (err) {
        const message =
          err instanceof FeedbackApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Feedback failed";
        setError(message);
      } finally {
        setLoading(null);
      }
    },
    [
      sessionId,
      songId,
      loading,
      currentAction,
      excludeSongIds,
      setFeedbackAction,
      addAssistantMessage,
      onAction,
      router,
    ],
  );

  const btnClass = compact
    ? "rounded-full px-2.5 py-1 text-[10px] font-bold"
    : "rounded-full px-3 py-1.5 text-xs font-bold";

  const activeClass = "bg-spotify-green text-black";
  const idleClass =
    "border border-white/15 bg-spotify-highlight text-white hover:border-spotify-green/40";

  const renderButton = (action: FeedbackAction, label: string, activeStyle?: string) => (
    <motion.button
      type="button"
      disabled={!!loading}
      whileTap={{ scale: 0.92 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void submit(action);
      }}
      className={`${btnClass} ${
        currentAction === action ? (activeStyle ?? activeClass) : idleClass
      }`}
      aria-pressed={currentAction === action}
      aria-label={label}
    >
      {loading === action ? "…" : label}
    </motion.button>
  );

  return (
    <div className={compact ? "mt-2" : "mt-3"} onClick={(e) => e.preventDefault()}>
      <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "gap-2"}`}>
        {renderButton("love", "♥ Love")}
        {renderButton("skip", "Skip", "bg-red-500/20 text-red-300")}
        {renderButton("more_like_this", "More")}
      </div>
      {error && (
        <p className="mt-1 text-[10px] text-red-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

import type { FeedbackAction, RecommendationCard } from "@/types";

export class FeedbackApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "FeedbackApiError";
  }
}

export interface FeedbackApiResponse {
  ok: true;
  action: FeedbackAction;
  songId: string;
  profile: {
    preferred_genres: string[];
    favorite_artists: string[];
    exploration_level: "conservative" | "balanced" | "adventurous";
  };
  analytics: {
    love: number;
    skip: number;
    more_like_this: number;
    total: number;
  };
  followUp?: {
    chatReply: string;
    cards: RecommendationCard[];
  };
}

export async function postFeedback(
  sessionId: string,
  songId: string,
  action: FeedbackAction,
  excludeSongIds?: string[],
): Promise<FeedbackApiResponse> {
  const response = await fetch("/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      songId,
      action,
      ...(excludeSongIds?.length ? { excludeSongIds } : {}),
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new FeedbackApiError(
      (body as { error?: string }).error ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  return body as FeedbackApiResponse;
}

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  getFeedbackAnalytics,
  getSkippedSongIds,
  recordFeedback,
} from "@/lib/data/feedback";
import { updateProfileFromFeedback } from "@/lib/data/profile";
import { getSongById } from "@/lib/data/songs";
import { getSession } from "@/lib/data/sessions";
import { generateExplanations } from "@/lib/explain/generate";
import { templateChatReply } from "@/lib/explain/fallback";
import { buildMoreLikeThisIntent } from "@/lib/feedback/profile-update";
import { FeedbackRequestSchema, FeedbackResponseSchema } from "@/lib/feedback/schema";
import { recommendSongs } from "@/lib/scoring/recommend";
import { FEEDBACK_RATE_LIMIT, checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(
    `feedback:${ip}`,
    FEEDBACK_RATE_LIMIT.limit,
    FEEDBACK_RATE_LIMIT.windowMs,
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before trying again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let input;
  try {
    input = FeedbackRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join("; ") },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const session = await getSession(input.sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const songRow = await getSongById(input.songId);
    if (!songRow) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    const artist = songRow.artists ?? {
      id: songRow.artist_id,
      name: "Unknown Artist",
      genres: [],
      similar_artists: [],
      bio: null,
    };

    await recordFeedback(input.sessionId, input.songId, input.action);
    const profile = await updateProfileFromFeedback(
      input.sessionId,
      songRow,
      artist,
      input.action,
    );
    const analytics = await getFeedbackAnalytics(input.sessionId);

    let followUp: { chatReply: string; cards: unknown[]; intent?: unknown } | undefined;

    if (input.action === "more_like_this") {
      const skipped = await getSkippedSongIds(input.sessionId);
      const excludeSongIds = [
        ...new Set([...skipped, input.songId, ...(input.excludeSongIds ?? [])]),
      ];

      const intent = buildMoreLikeThisIntent(songRow, artist, profile);
      const { candidates } = await recommendSongs({
        intent,
        profile,
        excludeSongIds,
      });

      if (candidates.length) {
        const explained = await generateExplanations({
          intent,
          candidates,
          includeChatReply: true,
          userMessage: `More like ${songRow.song_name} by ${artist.name}`,
        });

        const cards = candidates.map((candidate) => {
          const explanation = explained.explanations.find(
            (e) => e.songId === candidate.song.id,
          );
          return {
            candidate,
            explanation: explanation ?? {
              songId: candidate.song.id,
              whyYoullLikeIt: `Similar vibe to ${songRow.song_name}.`,
              whyInteresting: `Shares ${songRow.genre} discovery signals.`,
              discoverySource: "More like this",
              explorationPath: artist.similar_artists.slice(0, 3),
            },
          };
        });

        followUp = {
          chatReply:
            explained.chatReply ??
            templateChatReply(intent, candidates.length).replace(
              "Here are",
              `More like ${songRow.song_name} — here are`,
            ),
          cards,
          intent,
        };
      } else {
        followUp = {
          chatReply: `I couldn't find more tracks like ${songRow.song_name} right now. Try a different mood or artist?`,
          cards: [],
        };
      }
    }

    const response = FeedbackResponseSchema.parse({
      ok: true,
      action: input.action,
      songId: input.songId,
      profile: {
        preferred_genres: profile.preferred_genres,
        favorite_artists: profile.favorite_artists,
        exploration_level: profile.exploration_level,
      },
      analytics,
      followUp,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getOrDefaultProfile } from "@/lib/data/profile";
import { getSkippedSongIds } from "@/lib/data/feedback";
import { defaultTasteProfile } from "@/lib/data/profile-default";
import { getSession } from "@/lib/data/sessions";
import { recommendSongs } from "@/lib/scoring/recommend";
import { RecommendRequestSchema, RecommendResponseSchema } from "@/lib/scoring/schema";
import { RECOMMEND_RATE_LIMIT, checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(
    `recommend:${ip}`,
    RECOMMEND_RATE_LIMIT.limit,
    RECOMMEND_RATE_LIMIT.windowMs,
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
    input = RecommendRequestSchema.parse(body);
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
    if (input.sessionId) {
      const session = await getSession(input.sessionId);
      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
    }

    const profile = input.sessionId
      ? await getOrDefaultProfile(input.sessionId)
      : undefined;

    const tasteProfile = profile ?? defaultTasteProfile("00000000-0000-0000-0000-000000000000");

    const skippedIds = input.sessionId ? await getSkippedSongIds(input.sessionId) : [];
    const excludeSongIds = [
      ...new Set([...skippedIds, ...(input.excludeSongIds ?? [])]),
    ];

    const { candidates, partial } = await recommendSongs({
      intent: input.intent,
      profile: {
        ...tasteProfile,
        exploration_level: input.intent.explorationLevel,
      },
      limit: input.limit,
      excludeSongIds: excludeSongIds.length ? excludeSongIds : undefined,
    });

    const response = RecommendResponseSchema.parse({
      sessionId: input.sessionId,
      candidates,
      count: candidates.length,
      partial: partial || undefined,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recommendation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

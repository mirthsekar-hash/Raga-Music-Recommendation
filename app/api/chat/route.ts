import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { orchestrateChat, GeminiQuotaExceededError } from "@/lib/chat/orchestrate";
import { ChatRequestSchema, ChatResponseSchema } from "@/lib/explain/schema";
import { CHAT_RATE_LIMIT, checkRateLimit, getClientIp } from "@/lib/rate-limit";

/** Vercel Pro allows up to 60s; chat orchestration can exceed default 10s. */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(
    `chat:${ip}`,
    CHAT_RATE_LIMIT.limit,
    CHAT_RATE_LIMIT.windowMs,
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
    input = ChatRequestSchema.parse(body);
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
    const { response } = await orchestrateChat({
      message: input.message,
      sessionId: input.sessionId,
      history: input.history,
    });

    return NextResponse.json(ChatResponseSchema.parse(response));
  } catch (error) {
    if (error instanceof GeminiQuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : "Chat request failed";
    const status = message === "Session not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

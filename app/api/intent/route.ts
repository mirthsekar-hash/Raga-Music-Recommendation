import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  appendUserTurn,
  createSession,
  getSession,
  historyFromSession,
} from "@/lib/data/sessions";
import { extractIntent } from "@/lib/intent/extract";
import { IntentRequestSchema, IntentResponseSchema } from "@/lib/intent/schema";
import { GeminiQuotaExceededError } from "@/lib/gemini/generate";
import { INTENT_RATE_LIMIT, checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(
    `intent:${ip}`,
    INTENT_RATE_LIMIT.limit,
    INTENT_RATE_LIMIT.windowMs,
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
    input = IntentRequestSchema.parse(body);
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
    let sessionId = input.sessionId;

    if (sessionId) {
      const existing = await getSession(sessionId);
      if (!existing) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
    } else {
      sessionId = await createSession();
    }

    const session = await getSession(sessionId);
    const history =
      input.history ?? (session ? historyFromSession(session) : undefined);

    const { intent, clarifyingQuestion } = await extractIntent({
      message: input.message,
      history,
    });

    await appendUserTurn(sessionId, input.message, intent);

    const response = IntentResponseSchema.parse({
      sessionId,
      intent,
      clarifyingQuestion,
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof GeminiQuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    const message = error instanceof Error ? error.message : "Intent extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

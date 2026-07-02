import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { generateExplanations } from "@/lib/explain/generate";
import { ExplainRequestSchema, ExplainResponseSchema } from "@/lib/explain/schema";
import { EXPLAIN_RATE_LIMIT, checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(
    `explain:${ip}`,
    EXPLAIN_RATE_LIMIT.limit,
    EXPLAIN_RATE_LIMIT.windowMs,
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
    input = ExplainRequestSchema.parse(body);
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
    const result = await generateExplanations({
      intent: input.intent,
      candidates: input.candidates,
      includeChatReply: input.includeChatReply,
      userMessage: input.userMessage,
    });

    const response = ExplainResponseSchema.parse({
      chatReply: result.chatReply,
      explanations: result.explanations,
      usedTemplateFallback: result.usedTemplateFallback || undefined,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Explanation generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

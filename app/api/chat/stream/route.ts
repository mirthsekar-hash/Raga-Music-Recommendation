import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { orchestrateChat, GeminiQuotaExceededError } from "@/lib/chat/orchestrate";
import { ChatRequestSchema, ChatResponseSchema } from "@/lib/explain/schema";
import { CHAT_RATE_LIMIT, checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const maxDuration = 60;

function ndjsonLine(payload: unknown): string {
  return `${JSON.stringify(payload)}\n`;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(
    `chat:${ip}`,
    CHAT_RATE_LIMIT.limit,
    CHAT_RATE_LIMIT.windowMs,
  );

  if (!rateLimit.allowed) {
    return new Response(
      ndjsonLine({
        type: "error",
        error: "Too many requests. Please wait before trying again.",
        status: 429,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-store",
          "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(ndjsonLine({ type: "error", error: "Invalid JSON body", status: 400 }), {
      status: 400,
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
    });
  }

  let input;
  try {
    input = ChatRequestSchema.parse(body);
  } catch (error) {
    const message =
      error instanceof ZodError
        ? error.issues.map((i) => i.message).join("; ")
        : "Invalid request";
    return new Response(ndjsonLine({ type: "error", error: message, status: 400 }), {
      status: 400,
      headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(new TextEncoder().encode(ndjsonLine(payload)));

      try {
        const { response } = await orchestrateChat(
          {
            message: input.message,
            sessionId: input.sessionId,
            history: input.history,
          },
          (_phase, label) => {
            send({ type: "status", message: label });
          },
        );

        const parsed = ChatResponseSchema.parse(response);
        send({ type: "complete", data: parsed });
        controller.close();
      } catch (error) {
        if (error instanceof GeminiQuotaExceededError) {
          send({ type: "error", error: error.message, status: 503 });
        } else {
          const message = error instanceof Error ? error.message : "Chat request failed";
          const status = message === "Session not found" ? 404 : 500;
          send({ type: "error", error: message, status });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}

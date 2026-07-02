import type { ChatResponse } from "@/types";

export class ChatApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ChatApiError";
  }
}

export async function postChat(
  message: string,
  sessionId?: string | null,
): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      ...(sessionId ? { sessionId } : {}),
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ChatApiError(
      (body as { error?: string }).error ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  return body as ChatResponse;
}

export interface ChatStreamHandlers {
  onStatus?: (message: string) => void;
}

export async function postChatStream(
  message: string,
  sessionId: string | null | undefined,
  handlers?: ChatStreamHandlers,
): Promise<ChatResponse> {
  const response = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      ...(sessionId ? { sessionId } : {}),
    }),
  });

  if (!response.ok && !response.body) {
    const body = await response.json().catch(() => ({}));
    throw new ChatApiError(
      (body as { error?: string }).error ?? `Request failed (${response.status})`,
      response.status,
    );
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new ChatApiError("Streaming not supported", 500);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: ChatResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as {
        type: string;
        message?: string;
        data?: ChatResponse;
        error?: string;
        status?: number;
      };

      if (event.type === "status" && event.message) {
        handlers?.onStatus?.(event.message);
      } else if (event.type === "complete" && event.data) {
        finalResult = event.data;
      } else if (event.type === "error") {
        throw new ChatApiError(event.error ?? "Chat failed", event.status ?? 500);
      }
    }
  }

  if (!finalResult) {
    throw new ChatApiError("Chat stream ended without a response", 500);
  }

  return finalResult;
}

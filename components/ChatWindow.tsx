"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChatApiError, postChatStream } from "@/lib/api/chat-client";
import { VIBE_CHIPS } from "@/lib/constants/ui";
import { useSessionStore } from "@/lib/store/session";
import { BottomNav, RagaLogo } from "@/components/layout/BottomNav";
import { RecommendationGrid } from "@/components/RecommendationGrid";
import { ChatLoadingSkeleton } from "@/components/ui/Skeleton";
import { SpotifyLogo } from "@/components/ui/SpotifyLogo";
import { ErrorState } from "@/components/ui/ErrorState";
import { ServiceBanner } from "@/components/ui/ServiceBanner";
import { TypewriterText } from "@/components/ui/TypewriterText";
import { SendIcon } from "@/components/ui/SendIcon";

const WELCOME =
  "Perfect! I can help you with that. What kind of vibe are you looking for?";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function ChatWindow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q")?.trim() ?? "";

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [degradedNotice, setDegradedNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showVibeChips, setShowVibeChips] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoSentRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sessionId = useSessionStore((s) => s.sessionId);
  const messages = useSessionStore((s) => s.messages);
  const setSessionId = useSessionStore((s) => s.setSessionId);
  const addUserMessage = useSessionStore((s) => s.addUserMessage);
  const addAssistantMessage = useSessionStore((s) => s.addAssistantMessage);
  const clearSession = useSessionStore((s) => s.clearSession);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, showVibeChips, statusMessage]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setInput("");
      addUserMessage(trimmed);
      setError(null);
      setDegradedNotice(null);
      setShowVibeChips(false);
      setLoading(true);
      setStatusMessage(messages.length === 0 ? "Starting your discovery…" : "Sending…");

      try {
        const response = await postChatStream(trimmed, sessionId, {
          onStatus: (message) => setStatusMessage(message),
        });

        setSessionId(response.sessionId);
        addAssistantMessage({
          content: response.chatReply,
          cards: response.cards.length ? response.cards : undefined,
          clarifyingQuestion: response.clarifyingQuestion,
        });

        const lastMsgId = useSessionStore.getState().messages.at(-1)?.id;
        if (lastMsgId) setStreamingMessageId(lastMsgId);

        if (response.clarifyingQuestion) {
          setShowVibeChips(true);
        }

        if (response.explanationsFromTemplate) {
          setDegradedNotice(
            "AI narration is using backup templates right now — recommendations are still personalized.",
          );
        }

        if (searchParams.get("q")) {
          router.replace("/chat", { scroll: false });
        }
      } catch (err) {
        const message =
          err instanceof ChatApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Something went wrong";
        setError(message);
        setInput(trimmed);
      } finally {
        setLoading(false);
        setStatusMessage(null);
        inputRef.current?.focus();
      }
    },
    [loading, messages.length, sessionId, addUserMessage, addAssistantMessage, setSessionId, searchParams, router],
  );

  useEffect(() => {
    if (!hydrated || autoSentRef.current || !initialQuery) return;
    autoSentRef.current = true;
    void sendMessage(initialQuery);
  }, [hydrated, initialQuery, sendMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center p-8" role="status" aria-live="polite">
        <ChatLoadingSkeleton />
      </div>
    );
  }

  const showWelcome = messages.length === 0 && !loading && !initialQuery;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-spotify-black">
      <header className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3 pt-10">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-white" aria-label="Back to home">
            ←
          </Link>
          <RagaLogo size="sm" />
        </div>
        <div className="flex items-center gap-2">
          <SpotifyLogo size="sm" />
          <button
            type="button"
            onClick={() => {
              clearSession();
              window.location.href = "/chat";
            }}
            className="text-xs text-spotify-subtext hover:text-white"
          >
            New chat
          </button>
          <button type="button" className="text-spotify-subtext" aria-label="Menu">
            ⋮
          </button>
        </div>
      </header>

      <div
        className="flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-relevant="additions"
      >
        {degradedNotice && <ServiceBanner message={degradedNotice} variant="warning" />}

        {showWelcome && (
          <div className="mb-6 flex gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-spotify-green text-sm font-black text-black"
              aria-hidden
            >
              ♪
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-spotify-highlight px-4 py-3 text-sm text-white">
              {WELCOME}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="mb-4">
            {message.role === "user" ? (
              <div className="flex flex-col items-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-spotify-green px-4 py-3 text-sm font-medium text-black">
                  {message.content}
                </div>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-spotify-subtext-dim">
                  <time dateTime={message.timestamp}>{formatTime(message.timestamp)}</time>
                  <span className="text-spotify-green" aria-hidden>
                    ✓✓
                  </span>
                </p>
              </div>
            ) : (
              <div>
                <div className="flex gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-spotify-green text-sm font-black text-black"
                    aria-hidden
                  >
                    ♪
                  </div>
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-spotify-highlight px-4 py-3 text-sm text-white">
                    {streamingMessageId === message.id ? (
                      <TypewriterText text={message.content} />
                    ) : (
                      message.content
                    )}
                    <p className="mt-2 text-[10px] text-spotify-subtext-dim">
                      <time dateTime={message.timestamp}>{formatTime(message.timestamp)}</time>
                    </p>
                  </div>
                </div>
                {message.cards && message.cards.length > 0 && (
                  <div className="mt-3 pl-10">
                    <RecommendationGrid cards={message.cards} />
                    <Link
                      href="/results"
                      className="mt-3 inline-block text-xs font-bold text-spotify-green"
                    >
                      View all results &gt;
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {showVibeChips && (
          <div className="mb-4 grid grid-cols-2 gap-2 pl-10" role="group" aria-label="Quick vibe options">
            {VIBE_CHIPS.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => void sendMessage(chip.label)}
                className="rounded-xl border border-white/10 bg-spotify-highlight/80 px-3 py-2.5 text-left text-xs font-medium text-white transition hover:border-spotify-green/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-green"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex gap-2 pl-10" role="status" aria-live="polite">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-spotify-green text-sm font-black text-black"
              aria-hidden
            >
              ♪
            </div>
            <div className="flex flex-col gap-1 rounded-2xl bg-spotify-highlight px-4 py-3">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-spotify-subtext [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-spotify-subtext [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-spotify-subtext" />
              </div>
              {statusMessage && (
                <p className="text-[10px] text-spotify-subtext-dim">{statusMessage}</p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4">
            <ErrorState
              message={error}
              onRetry={() => {
                const lastUser = [...messages].reverse().find((m) => m.role === "user");
                if (lastUser) void sendMessage(lastUser.content);
              }}
            />
          </div>
        )}

        <div ref={bottomRef} />
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-white/5 bg-spotify-black px-4 py-3">
        <form onSubmit={handleSubmit} className="relative" aria-label="Send a message">
          <label htmlFor="chat-input" className="sr-only">
            Message Raga
          </label>
          <input
            id="chat-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            suppressHydrationWarning
            autoComplete="off"
            className="w-full rounded-full bg-spotify-highlight py-3.5 pl-4 pr-14 text-sm text-white placeholder:text-spotify-subtext-dim outline-none ring-1 ring-white/5 focus-visible:ring-2 focus-visible:ring-spotify-green disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            suppressHydrationWarning
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-spotify-green text-black disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spotify-green"
            aria-label="Send message"
          >
            <SendIcon size={16} />
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-spotify-subtext-dim">
          🔒 Raga may make mistakes. Please give feedback.
        </p>
      </div>

      <BottomNav active="raga" />
    </div>
  );
}

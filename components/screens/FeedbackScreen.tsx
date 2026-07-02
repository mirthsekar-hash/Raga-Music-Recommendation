"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlbumArt } from "@/components/AlbumArt";
import { BackButton, BottomNav } from "@/components/layout/BottomNav";
import { FeedbackApiError, postFeedback } from "@/lib/api/feedback-client";
import { FEEDBACK_NEXT, FEEDBACK_TAGS } from "@/lib/constants/ui";
import { useSessionStore } from "@/lib/store/session";
import type { FeedbackAction } from "@/types";

interface FeedbackScreenProps {
  songId: string;
}

function mapFormToAction(rating: number, nextPref: string): FeedbackAction {
  if (nextPref === "More like this") return "more_like_this";
  if (rating >= 3) return "skip";
  return "love";
}

export function FeedbackScreen({ songId }: FeedbackScreenProps) {
  const router = useRouter();
  const sessionId = useSessionStore((s) => s.sessionId);
  const card = useSessionStore((s) => s.cardsById[songId]);
  const setFeedbackAction = useSessionStore((s) => s.setFeedbackAction);
  const addAssistantMessage = useSessionStore((s) => s.addAssistantMessage);

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(["Mood matched"]);
  const [nextPref, setNextPref] = useState("More like this");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (!card) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <p className="text-xl font-bold text-white">Song not found</p>
        <Link href="/chat" className="mt-6 text-spotify-green">
          Back to chat
        </Link>
      </div>
    );
  }

  const { song, artist } = card.candidate;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async () => {
    if (!sessionId) {
      setError("Start a chat session first.");
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    const action = mapFormToAction(rating, nextPref);

    try {
      const result = await postFeedback(sessionId, songId, action);
      setFeedbackAction(songId, action);
      setSubmitted(true);

      if (action === "more_like_this" && result.followUp) {
        addAssistantMessage({
          content: result.followUp.chatReply,
          cards: result.followUp.cards.length ? result.followUp.cards : undefined,
        });
        router.push("/chat");
        return;
      }

      router.replace(`/results/${songId}`);
    } catch (err) {
      const message =
        err instanceof FeedbackApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Feedback failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const ratings = ["Love it", "Like it", "It's ok", "Not for me", "Dislike"];
  const emojis = ["😍", "🙂", "😐", "😕", "👎"];

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-spotify-black">
      <header className="flex items-center justify-between px-4 py-3 pt-10">
        <BackButton href={`/results/${songId}`} />
        <h1 className="text-sm font-bold text-white">Share your feedback</h1>
        <button type="button" className="text-spotify-subtext" aria-label="Info">
          ⓘ
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-28">
        <div className="flex items-center gap-3 rounded-xl bg-spotify-highlight p-3">
          <AlbumArt song={song} artist={artist} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-white">{song.song_name}</p>
            <p className="truncate text-sm text-spotify-subtext">{artist.name}</p>
            <p className="text-xs text-spotify-subtext-dim">{song.genre}</p>
          </div>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black"
            aria-label="Play"
          >
            ▶
          </button>
        </div>

        {submitted && (
          <div className="mt-4 rounded-xl bg-spotify-green/10 px-4 py-3 text-sm text-spotify-green ring-1 ring-spotify-green/30">
            Thanks — your taste profile has been updated.
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-bold text-white">How would you rate this?</h2>
          <div className="mt-4 flex justify-between gap-1">
            {ratings.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setRating(i)}
                className={`flex flex-col items-center gap-1 text-[9px] ${
                  rating === i ? "text-spotify-green" : "text-spotify-subtext-dim"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                    rating === i ? "ring-2 ring-spotify-green" : "bg-spotify-highlight"
                  }`}
                >
                  {emojis[i]}
                </span>
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-white">Tell us more (optional)</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {FEEDBACK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  selectedTags.includes(tag)
                    ? "border-spotify-green text-spotify-green"
                    : "border-white/20 text-white"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-white">What would you like next?</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {FEEDBACK_NEXT.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setNextPref(opt)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  nextPref === opt
                    ? "border-spotify-green text-spotify-green"
                    : "border-white/20 text-white"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-white">Anything else you want Raga to know?</h2>
          <div className="relative mt-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 200))}
              placeholder="Share your thoughts..."
              rows={4}
              className="w-full resize-none rounded-xl bg-spotify-highlight px-4 py-3 text-sm text-white placeholder:text-spotify-subtext-dim outline-none ring-1 ring-white/5"
            />
            <span className="absolute bottom-3 right-3 text-[10px] text-spotify-subtext-dim">
              {notes.length}/200
            </span>
          </div>
        </section>

        <div className="mt-6 rounded-xl bg-spotify-green/10 px-4 py-3 text-xs text-spotify-subtext ring-1 ring-spotify-green/20">
          ✨ Your feedback helps Raga learn your taste and find even better music for you.
        </div>
      </main>

      <div className="fixed bottom-[4.5rem] left-0 right-0 z-10 mx-auto max-w-lg px-4">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleSubmit()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-spotify-green py-3.5 text-sm font-bold text-black disabled:opacity-60"
        >
          {submitting ? "Sending…" : "✈ Submit Feedback"}
        </button>
        {error && (
          <p className="mt-2 text-center text-[10px] text-red-300">{error}</p>
        )}
      </div>

      <BottomNav active="raga" />
    </div>
  );
}

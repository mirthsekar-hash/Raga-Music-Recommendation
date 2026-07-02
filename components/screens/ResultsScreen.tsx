"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlbumArt } from "@/components/AlbumArt";
import { FeedbackControls } from "@/components/FeedbackControls";
import { BackButton, BottomNav, RagaLogo } from "@/components/layout/BottomNav";
import { SpotifyLogo } from "@/components/ui/SpotifyLogo";
import { EXPLORE_CATEGORIES, FILTER_PILLS } from "@/lib/constants/ui";
import { truncateForCard } from "@/lib/explain/schema";
import { useSessionStore } from "@/lib/store/session";
import type { RecommendationCard } from "@/types";

function ResultListCard({ card }: { card: RecommendationCard }) {
  const { candidate, explanation } = card;
  const { song, artist, matchedSignals } = candidate;

  return (
    <div className="rounded-xl border border-white/5 bg-spotify-highlight/50 p-3">
      <Link
        href={`/results/${song.id}`}
        className="flex gap-3 transition hover:opacity-90"
      >
      <AlbumArt song={song} artist={artist} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-bold text-white">{song.song_name}</p>
            <p className="truncate text-sm text-spotify-subtext">{artist.name}</p>
            <p className="mt-0.5 text-xs text-spotify-subtext-dim">
              {song.genre} • {matchedSignals.isHiddenGem ? "Hidden gem" : "Discovery"}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            className="shrink-0 text-spotify-subtext-dim"
            aria-label="More options"
          >
            ⋮
          </button>
        </div>
        <div className="mt-2 space-y-1">
          <p className="flex items-start gap-1.5 text-[11px] text-spotify-subtext">
            <span className="text-spotify-green">♥</span>
            <span>
              <span className="font-semibold text-white">Why you&apos;ll like it: </span>
              {truncateForCard(explanation.whyYoullLikeIt, 90)}
            </span>
          </p>
          <p className="flex items-start gap-1.5 text-[11px] text-spotify-subtext">
            <span className="text-amber-400">☆</span>
            <span>
              <span className="font-semibold text-white">Why it&apos;s interesting: </span>
              {truncateForCard(explanation.whyInteresting, 90)}
            </span>
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => e.preventDefault()}
        className="flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-full bg-white text-black"
        aria-label="Play"
      >
        ▶
      </button>
      </Link>
      <FeedbackControls songId={song.id} compact />
    </div>
  );
}

export function ResultsScreen() {
  const [hydrated, setHydrated] = useState(false);
  const [activeFilter, setActiveFilter] = useState<(typeof FILTER_PILLS)[number]>("All");
  const cardsById = useSessionStore((s) => s.cardsById);
  const feedbackBySongId = useSessionStore((s) => s.feedbackBySongId);
  const cards = Object.values(cardsById).filter(
    (card) => feedbackBySongId[card.candidate.song.id] !== "skip",
  );

  useEffect(() => setHydrated(true), []);

  const filtered =
    activeFilter === "Artists"
      ? []
      : activeFilter === "Playlists"
        ? []
        : cards;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-spotify-black">
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3 pt-10">
        <div className="flex items-center gap-2">
          <BackButton href="/chat" />
          <RagaLogo size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <SpotifyLogo size="sm" />
          <button type="button" className="text-spotify-subtext" aria-label="Filter">
            ⧩
          </button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {FILTER_PILLS.map((pill) => (
          <button
            key={pill}
            type="button"
            onClick={() => setActiveFilter(pill)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${
              activeFilter === pill
                ? "bg-spotify-green text-black"
                : "border border-white/10 bg-spotify-highlight text-white"
            }`}
          >
            {pill}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-4">
        {!hydrated ? (
          <p className="py-12 text-center text-spotify-subtext">Loading…</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No recommendations yet"
            description="Start a chat with Raga to discover music."
            actionHref="/chat"
            actionLabel="Open Chat"
          />
        ) : (
          <>
            <div className="mb-4">
              <h2 className="flex items-center gap-1.5 text-base font-bold text-white">
                <span className="text-spotify-green">✦</span> Recommended for you
              </h2>
              <p className="text-xs text-spotify-subtext-dim">
                Curated using your taste + discovery signals
              </p>
            </div>
            <div className="space-y-3">
              {filtered.map((card) => (
                <ResultListCard key={card.candidate.song.id} card={card} />
              ))}
            </div>
          </>
        )}

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-bold text-white">
              <span className="text-spotify-green">✦</span> More to explore
            </h2>
            <span className="text-xs font-semibold text-spotify-green">View all &gt;</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {EXPLORE_CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                href={`/chat?q=${encodeURIComponent(cat.label)}`}
                className="flex min-w-[140px] shrink-0 items-center gap-2 rounded-xl border border-white/5 bg-spotify-highlight/80 px-3 py-3"
              >
                <span className={`text-lg ${cat.color}`}>
                  {cat.icon === "headphones" ? "🎧" : cat.icon === "mic" ? "🎤" : cat.icon === "guitar" ? "🎸" : "🌍"}
                </span>
                <span className="text-xs font-semibold leading-tight text-white">{cat.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <BottomNav active="raga" />
    </div>
  );
}

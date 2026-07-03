"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AlbumArt } from "@/components/AlbumArt";
import { FeedbackControls } from "@/components/FeedbackControls";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { DiscoveryBadges, discoverySubtitle } from "@/components/ui/DiscoveryBadges";
import { useSessionStore } from "@/lib/store/session";

export function ResultDetailClient() {
  const params = useParams();
  const songId = typeof params.songId === "string" ? params.songId : "";
  const [hydrated, setHydrated] = useState(false);
  const card = useSessionStore((s) => (songId ? s.cardsById[songId] : undefined));

  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return <p className="py-20 text-center text-spotify-subtext">Loading…</p>;
  }

  if (!card) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-spotify-black">
        <AppHeader variant="inner" backHref="/results" />
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-xl font-bold text-white">Track not found</p>
          <Link href="/chat" className="mt-6 text-spotify-green">
            Back to chat
          </Link>
        </div>
        <BottomNav active="raga" />
      </div>
    );
  }

  const { candidate, explanation } = card;
  const { song, artist, matchedSignals } = candidate;

  return (
    <>
      <AppHeader
        variant="inner"
        backHref="/results"
        actions={
          <button type="button" className="text-spotify-subtext" aria-label="More">
            ⋮
          </button>
        }
      />

      <div className="px-4 pb-32 pt-5">
        <div className="flex gap-4">
          <AlbumArt song={song} artist={artist} size="lg" className="!h-36 !w-36 md:!h-40 md:!w-40" />
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-2xl font-black leading-tight text-white">{song.song_name}</h1>
            <p className="mt-1 text-lg text-spotify-subtext">{artist.name}</p>
            <DiscoveryBadges signals={matchedSignals} className="mt-2 gap-2" />
            <p className="mt-2 text-xs text-spotify-subtext-dim">
              {song.genre} • {discoverySubtitle(matchedSignals)} pick
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-spotify-green text-xl text-black"
                aria-label="Play"
              >
                ▶
              </button>
            </div>
            <FeedbackControls songId={song.id} />
          </div>
        </div>

        <section className="mt-6 rounded-xl border border-white/5 bg-spotify-highlight/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <span className="text-spotify-green">♥</span> Why you&apos;ll like it
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-spotify-subtext">
            {explanation.whyYoullLikeIt}
          </p>
        </section>

        <section className="mt-3 rounded-xl border border-white/5 bg-spotify-highlight/60 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <span className="text-amber-400">☆</span> Why it&apos;s interesting
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-spotify-subtext">
            {explanation.whyInteresting}
          </p>
        </section>

        <section className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-spotify-highlight/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-spotify-green/20 text-spotify-green">
              〰
            </span>
            <div>
              <p className="text-sm font-bold text-white">
                Discovery signal <span className="text-spotify-green">• High</span>
              </p>
              <p className="text-xs text-spotify-subtext-dim">{explanation.discoverySource}</p>
            </div>
          </div>
          <span className="text-spotify-subtext-dim">&gt;</span>
        </section>

        {artist.similar_artists.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Similar artists you may enjoy</h2>
              <span className="text-xs text-spotify-green">View all &gt;</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {artist.similar_artists.map((name) => (
                <div key={name} className="flex w-20 shrink-0 flex-col items-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/40 to-spotify-highlight text-lg font-bold text-white">
                    {name.slice(0, 1)}
                  </div>
                  <p className="mt-2 w-full truncate text-center text-xs font-bold text-white">
                    {name}
                  </p>
                  <p className="text-[10px] text-spotify-subtext-dim">{song.genre}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {explanation.explorationPath.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-bold text-white">Exploration path</h2>
            <ul className="mt-2 space-y-1">
              {explanation.explorationPath.map((step) => (
                <li key={step} className="text-sm text-spotify-subtext">
                  → {step}
                </li>
              ))}
            </ul>
          </section>
        )}

        <Link
          href={`/feedback/${song.id}`}
          className="mt-8 flex w-full items-center justify-center rounded-full border border-spotify-green py-3 text-sm font-bold text-spotify-green"
        >
          Share feedback
        </Link>
      </div>

      <div className="fixed bottom-[4.5rem] left-0 right-0 z-10 mx-auto max-w-lg border-t border-white/5 bg-spotify-highlight/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <AlbumArt song={song} artist={artist} size="sm" className="!h-10 !w-10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{song.song_name}</p>
            <p className="truncate text-xs text-spotify-subtext">{artist.name}</p>
          </div>
          <button type="button" className="text-white" aria-label="Play">
            ▶
          </button>
        </div>
      </div>

      <BottomNav active="raga" />
    </>
  );
}

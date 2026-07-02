"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AlbumArt } from "@/components/AlbumArt";
import { FeedbackControls } from "@/components/FeedbackControls";
import { DiscoveryBadges } from "@/components/ui/DiscoveryBadges";
import { truncateForCard } from "@/lib/explain/schema";
import type { RecommendationCard } from "@/types";

interface RecommendationCardProps {
  card: RecommendationCard;
  compact?: boolean;
  index?: number;
}

export function RecommendationCardView({
  card,
  compact = false,
  index = 0,
}: RecommendationCardProps) {
  const { candidate, explanation } = card;
  const { song, artist, matchedSignals } = candidate;
  const href = `/results/${song.id}`;

  const motionProps = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, delay: index * 0.06 },
  };

  if (compact) {
    return (
      <motion.div
        {...motionProps}
        className="flex min-w-[280px] max-w-[300px] shrink-0 flex-col rounded-xl border border-white/5 bg-spotify-highlight/80 p-3"
      >
        <Link href={href} className="flex gap-3 transition hover:opacity-90">
          <AlbumArt song={song} artist={artist} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{song.song_name}</p>
            <p className="truncate text-xs text-spotify-subtext">{artist.name}</p>
            <DiscoveryBadges signals={matchedSignals} className="mt-1.5 gap-1.5" />
            <p className="mt-1.5 line-clamp-2 text-[10px] text-spotify-subtext-dim">
              {truncateForCard(explanation.whyYoullLikeIt, 80)}
            </p>
          </div>
        </Link>
        <FeedbackControls songId={song.id} compact />
      </motion.div>
    );
  }

  return (
    <motion.div
      {...motionProps}
      className="w-full rounded-xl border border-white/5 bg-spotify-highlight/60 p-3"
    >
      <Link href={href} className="flex gap-3 transition hover:opacity-90">
        <AlbumArt song={song} artist={artist} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-white">{song.song_name}</p>
          <p className="truncate text-sm text-spotify-subtext">{artist.name}</p>
          <DiscoveryBadges signals={matchedSignals} className="mt-2 gap-1.5" />
          <p className="mt-2 line-clamp-2 text-xs text-spotify-subtext-dim">
            {truncateForCard(explanation.whyYoullLikeIt)}
          </p>
        </div>
      </Link>
      <FeedbackControls songId={song.id} />
    </motion.div>
  );
}

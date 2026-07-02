"use client";

import Image from "next/image";
import { useState } from "react";
import type { Song, Artist } from "@/types";

const GRADIENTS = [
  "from-emerald-600/80 to-spotify-base",
  "from-violet-600/70 to-spotify-base",
  "from-rose-600/60 to-spotify-base",
  "from-amber-600/60 to-spotify-base",
  "from-cyan-600/60 to-spotify-base",
  "from-fuchsia-600/60 to-spotify-base",
];

function pickGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

interface AlbumArtProps {
  song: Pick<Song, "song_name" | "album_art_url" | "genre">;
  artist: Pick<Artist, "name">;
  size?: "sm" | "md" | "lg";
  className?: string;
  priority?: boolean;
}

const sizePx = {
  sm: 56,
  md: 96,
  lg: 288,
} as const;

const sizeClasses = {
  sm: "h-14 w-14 text-lg",
  md: "h-24 w-24 text-2xl",
  lg: "h-56 w-56 text-5xl md:h-72 md:w-72",
};

export function AlbumArt({
  song,
  artist,
  size = "md",
  className = "",
  priority = false,
}: AlbumArtProps) {
  const [failed, setFailed] = useState(false);
  const gradient = pickGradient(`${song.song_name}-${artist.name}`);
  const initials = song.song_name.slice(0, 1).toUpperCase();
  const px = sizePx[size];

  if (song.album_art_url && !failed) {
    return (
      <Image
        src={song.album_art_url}
        alt={`${song.song_name} by ${artist.name}`}
        width={px}
        height={px}
        priority={priority}
        unoptimized
        className={`shrink-0 rounded-md object-cover shadow-lg ${sizeClasses[size]} ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br font-black text-white shadow-lg ${gradient} ${sizeClasses[size]} ${className}`}
      aria-hidden
    >
      {initials}
    </div>
  );
}

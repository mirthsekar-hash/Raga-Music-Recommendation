"use client";

import type { ReactNode } from "react";
import { BackButton, RagaLogo } from "@/components/layout/BottomNav";
import { SpotifyLogo } from "@/components/ui/SpotifyLogo";

function HeaderUtilities() {
  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-lg text-white transition hover:bg-white/10"
        aria-label="Notifications"
      >
        🔔
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-spotify-green ring-2 ring-spotify-black" />
      </button>
      <button
        type="button"
        className="h-9 w-9 overflow-hidden rounded-full bg-spotify-green ring-2 ring-white/10 transition hover:ring-spotify-green/60"
        aria-label="Your profile"
      >
        <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
          V
        </div>
      </button>
    </div>
  );
}

export interface AppHeaderProps {
  /** Home shows Raga hero only; inner adds back + optional actions. */
  variant?: "home" | "inner";
  backHref?: string;
  ragaSize?: "sm" | "md" | "lg";
  /** Trailing controls on the Raga row (e.g. New chat, filter). */
  actions?: ReactNode;
  className?: string;
}

export function AppHeader({
  variant = "inner",
  backHref = "/",
  ragaSize,
  actions,
  className = "",
}: AppHeaderProps) {
  const logoSize = ragaSize ?? (variant === "home" ? "lg" : "sm");

  return (
    <header className={`shrink-0 px-5 pt-12 ${className}`}>
      <div className="flex items-center justify-between">
        <SpotifyLogo size="md" showWordmark variant="topbar" />
        <HeaderUtilities />
      </div>

      <div className="my-4 border-b border-white/10" aria-hidden />

      <div className="flex items-center justify-between gap-3 pb-4">
        <div className="flex min-w-0 items-center gap-0.5">
          {variant === "inner" && <BackButton href={backHref} />}
          <RagaLogo size={logoSize} />
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
      </div>

      <div className="border-b border-white/10" aria-hidden />
    </header>
  );
}

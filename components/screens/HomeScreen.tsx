"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRY_THESE, RECENT_SEARCHES } from "@/lib/constants/ui";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomNav } from "@/components/layout/BottomNav";
import { NavigationLoader } from "@/components/ui/NavigationLoader";
import { SendIcon } from "@/components/ui/SendIcon";

function TryTheseIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    moon: "🌙",
    headphones: "🎧",
    guitar: "🎸",
    rocket: "🚀",
    gem: "💎",
    coffee: "☕",
  };
  return <span className="text-xl">{icons[type] ?? "🎵"}</span>;
}

export function HomeScreen() {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);
  const [navMessage, setNavMessage] = useState("Starting your discovery…");
  const [searchQuery, setSearchQuery] = useState("");

  const goToChat = (query: string, message = "Starting your discovery…") => {
    const trimmed = query.trim();
    if (!trimmed || navigating) return;
    setNavMessage(message);
    setNavigating(true);
    router.push(`/chat?q=${encodeURIComponent(trimmed)}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToChat(searchQuery, "Searching for music…");
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-spotify-black">
      {navigating && <NavigationLoader message={navMessage} />}

      <AppHeader variant="home" />

      <main className="flex-1 overflow-y-auto px-5 pb-4 pt-5">
        <h1 className="text-3xl font-black text-white">
          Hi there! <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-lg text-spotify-subtext">What do you want to discover today?</p>

        <form onSubmit={handleSearchSubmit} className="mt-6">
          <div className="flex items-center gap-3 rounded-2xl bg-spotify-highlight px-4 py-3.5 ring-1 ring-white/5 focus-within:ring-spotify-green/40">
            <span className="text-spotify-subtext" aria-hidden>
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ask Raga anything..."
              disabled={navigating}
              suppressHydrationWarning
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-spotify-subtext-dim outline-none disabled:opacity-50"
              aria-label="Ask Raga"
            />
            <button
              type="submit"
              disabled={navigating || !searchQuery.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-spotify-green text-black disabled:opacity-40"
              aria-label="Send"
            >
              {navigating ? (
                <span className="text-xs font-bold">…</span>
              ) : (
                <SendIcon size={16} />
              )}
            </button>
          </div>
        </form>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-white">Try these</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {TRY_THESE.map((item) => (
              <button
                key={item.label}
                type="button"
                disabled={navigating}
                onClick={() => goToChat(item.label, `Finding ${item.label.toLowerCase()}…`)}
                className="flex items-center gap-3 rounded-xl bg-spotify-highlight/90 px-3 py-3.5 text-left ring-1 ring-white/5 transition hover:bg-spotify-highlight disabled:opacity-50"
              >
                <TryTheseIcon type={item.icon} />
                <span className="text-xs font-semibold leading-tight text-white">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-white">Recent searches</h2>
          <ul className="mt-2 divide-y divide-white/5 rounded-xl bg-spotify-highlight/40 ring-1 ring-white/5">
            {RECENT_SEARCHES.map((query) => (
              <li key={query}>
                <button
                  type="button"
                  disabled={navigating}
                  onClick={() => goToChat(query, "Loading your search…")}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-spotify-subtext transition hover:text-white disabled:opacity-50"
                >
                  {query}
                  <span className="text-spotify-subtext-dim" aria-hidden>
                    🕐
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl bg-gradient-to-r from-spotify-green/20 to-spotify-highlight p-4 ring-1 ring-spotify-green/20">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1 text-sm font-bold text-white">
                <span>✨</span> Discover hidden gems
              </p>
              <p className="mt-1 text-xs text-spotify-subtext">
                Explore amazing music beyond the mainstream
              </p>
            </div>
            <button
              type="button"
              disabled={navigating}
              onClick={() => goToChat("Give me hidden gems", "Finding hidden gems…")}
              className="shrink-0 rounded-full bg-spotify-green px-4 py-2 text-xs font-bold text-black disabled:opacity-50"
            >
              Explore now &gt;
            </button>
          </div>
        </section>
      </main>

      <BottomNav active="raga" />
    </div>
  );
}

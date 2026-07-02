import Link from "next/link";
import { TRY_THESE, RECENT_SEARCHES } from "@/lib/constants/ui";
import { BottomNav, RagaLogo } from "@/components/layout/BottomNav";

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
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col bg-spotify-black">
      <header className="flex items-center justify-between px-5 pt-12 pb-4">
        <RagaLogo />
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-white"
            aria-hidden
          >
            🔔
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-spotify-green" />
          </div>
          <div className="h-9 w-9 overflow-hidden rounded-full bg-spotify-highlight ring-2 ring-spotify-green/30">
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-spotify-highlight text-xs font-bold">
              P
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 pb-4">
        <h1 className="text-3xl font-black text-white">
          Hi there! <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-lg text-spotify-subtext">What do you want to discover today?</p>

        <form action="/chat" method="get" className="mt-6">
          <div className="flex items-center gap-3 rounded-2xl bg-spotify-highlight px-4 py-3.5 ring-1 ring-white/5">
            <span className="text-spotify-subtext">🔍</span>
            <input
              type="text"
              name="q"
              placeholder="Ask Raga anything..."
              suppressHydrationWarning
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-spotify-subtext-dim outline-none"
              aria-label="Ask Raga"
            />
            <span className="text-spotify-green" aria-hidden>
              🎤
            </span>
          </div>
        </form>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-white">Try these</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {TRY_THESE.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-xl bg-spotify-highlight/90 px-3 py-3.5 ring-1 ring-white/5 transition hover:bg-spotify-highlight"
              >
                <TryTheseIcon type={item.icon} />
                <span className="text-xs font-semibold leading-tight text-white">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-white">Recent searches</h2>
          <ul className="mt-2 divide-y divide-white/5 rounded-xl bg-spotify-highlight/40 ring-1 ring-white/5">
            {RECENT_SEARCHES.map((query) => (
              <li key={query}>
                <Link
                  href={`/chat?q=${encodeURIComponent(query)}`}
                  className="flex items-center justify-between px-4 py-3.5 text-sm text-spotify-subtext transition hover:text-white"
                >
                  {query}
                  <span className="text-spotify-subtext-dim">🕐</span>
                </Link>
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
            <Link
              href="/chat?q=Give%20me%20hidden%20gems"
              className="shrink-0 rounded-full bg-spotify-green px-4 py-2 text-xs font-bold text-black"
            >
              Explore now &gt;
            </Link>
          </div>
        </section>
      </main>

      <BottomNav active="home" />
    </div>
  );
}

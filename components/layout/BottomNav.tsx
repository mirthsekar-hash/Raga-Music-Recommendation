import Link from "next/link";

export function RagaLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "sm" ? "h-8 w-8 text-sm" : size === "lg" ? "h-12 w-12 text-xl" : "h-9 w-9 text-base";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex ${box} items-center justify-center rounded-full bg-spotify-green font-black text-black`}
      >
        ♪
      </div>
      <div>
        <span className={`font-black text-spotify-green ${text}`}>Raga</span>
        {size !== "sm" && (
          <p className="text-[10px] leading-tight text-spotify-subtext-dim">
            AI Music Discovery Companion
          </p>
        )}
      </div>
    </div>
  );
}

interface BottomNavProps {
  active: "home" | "search" | "raga" | "library";
}

const items = [
  { id: "home" as const, label: "Home", href: "/", icon: HomeIcon },
  { id: "search" as const, label: "Search", href: "/chat", icon: SearchIcon },
  { id: "raga" as const, label: "Raga", href: "/chat", icon: RagaIcon },
  { id: "library" as const, label: "Library", href: "/results", icon: LibraryIcon },
];

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="shrink-0 border-t border-white/5 bg-spotify-black pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {items.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex min-w-[4rem] flex-col items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium transition ${
                isActive ? "text-spotify-green" : "text-spotify-subtext-dim hover:text-white"
              }`}
            >
              <Icon active={isActive} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z" />
    </svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </svg>
  );
}

function RagaIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
    </svg>
  );
}

function LibraryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
      <rect x="3" y="4" width="4" height="16" rx="1" fill={active ? "currentColor" : "none"} />
      <rect x="10" y="4" width="4" height="16" rx="1" />
      <rect x="17" y="4" width="4" height="10" rx="1" />
    </svg>
  );
}

export function BackButton({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
      aria-label="Go back"
    >
      ←
    </Link>
  );
}

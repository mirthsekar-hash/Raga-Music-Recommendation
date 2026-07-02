type BadgeVariant = "gem" | "emerging" | "trending" | "genre" | "neutral";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, string> = {
  gem: "bg-spotify-green/15 text-spotify-green border-spotify-green/30",
  emerging: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  trending: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  genre: "bg-white/10 text-spotify-subtext border-white/10",
  neutral: "bg-spotify-surface text-spotify-subtext border-spotify-highlight",
};

export function Badge({ variant = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

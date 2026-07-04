const RAGA_STAR_PATH =
  "M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z";

const AVATAR_SIZES = {
  sm: { box: "h-8 w-8", star: 14 },
  md: { box: "h-9 w-9", star: 18 },
  lg: { box: "h-12 w-12", star: 22 },
  xl: { box: "h-14 w-14", star: 26 },
} as const;

export function RagaStar({
  size,
  filled = true,
  className = "",
}: {
  size: number;
  filled?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <path d={RAGA_STAR_PATH} />
    </svg>
  );
}

/** Green circle with Raga star — chat avatars, loader, logo mark. */
export function RagaAvatar({
  size = "sm",
  className = "",
}: {
  size?: keyof typeof AVATAR_SIZES;
  className?: string;
}) {
  const { box, star } = AVATAR_SIZES[size];

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-spotify-green text-black ${box} ${className}`}
      aria-hidden
    >
      <RagaStar size={star} />
    </div>
  );
}

export function RagaLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg";
  const avatarSize = size === "lg" ? "lg" : size === "sm" ? "sm" : "md";

  return (
    <div className="flex items-center gap-2">
      <RagaAvatar size={avatarSize} />
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

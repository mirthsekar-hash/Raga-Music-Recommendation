"use client";

interface NavigationLoaderProps {
  message?: string;
}

export function NavigationLoader({
  message = "Starting your discovery…",
}: NavigationLoaderProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-spotify-black/95 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-5 px-8 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-spotify-green/20" />
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-spotify-green text-2xl font-black text-black">
            ♪
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-bold text-white">{message}</p>
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-spotify-green [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-spotify-green [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-spotify-green" />
          </div>
        </div>
      </div>
    </div>
  );
}

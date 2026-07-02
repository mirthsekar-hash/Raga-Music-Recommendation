interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-spotify-highlight/80 ${className}`}
      aria-hidden
    />
  );
}

export function ChatLoadingSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-md space-y-2 rounded-2xl bg-spotify-highlight p-4">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="mt-4 flex gap-3">
          <Skeleton className="h-24 w-24 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

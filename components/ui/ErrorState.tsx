interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-center"
    >
      <p className="text-sm font-bold text-red-100">{title}</p>
      <p className="mt-1 text-sm text-red-200/90">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-full bg-red-500/20 px-4 py-1.5 text-xs font-bold text-red-100 underline-offset-2 hover:underline"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

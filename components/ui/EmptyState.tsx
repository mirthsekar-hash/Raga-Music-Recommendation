import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: EmptyStateProps) {
  return (
    <div className="py-16 text-center" role="status">
      <p className="text-lg font-bold text-white">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-spotify-subtext">{description}</p>
      )}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-6 inline-block rounded-full bg-spotify-green px-6 py-2.5 text-sm font-bold text-black"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

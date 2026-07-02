interface ServiceBannerProps {
  message: string;
  variant?: "info" | "warning";
}

export function ServiceBanner({ message, variant = "info" }: ServiceBannerProps) {
  const styles =
    variant === "warning"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
      : "border-spotify-green/30 bg-spotify-green/10 text-spotify-subtext";

  return (
    <div
      role="status"
      className={`mb-3 rounded-xl border px-3 py-2 text-xs ${styles}`}
    >
      {message}
    </div>
  );
}

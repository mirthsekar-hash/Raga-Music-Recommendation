"use client";

import { ErrorState } from "@/components/ui/ErrorState";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-spotify-black p-6 font-sans text-white">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-xl font-bold">Raga hit a snag</h1>
          <ErrorState message={error.message || "An unexpected error occurred."} onRetry={reset} />
          <Link href="/" className="text-sm text-spotify-green">
            Back to home
          </Link>
        </div>
      </body>
    </html>
  );
}

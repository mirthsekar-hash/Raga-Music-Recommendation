import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-spotify-black px-6 text-center text-white">
      <p className="text-6xl font-black text-spotify-green">404</p>
      <h1 className="mt-4 text-xl font-bold">Page not found</h1>
      <p className="mt-2 text-sm text-spotify-subtext">
        This track or page doesn&apos;t exist in your session.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-spotify-green px-6 py-2.5 text-sm font-bold text-black"
      >
        Back to Raga
      </Link>
    </div>
  );
}

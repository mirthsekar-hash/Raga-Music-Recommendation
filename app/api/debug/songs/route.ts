import { NextRequest, NextResponse } from "next/server";
import { getSongsByFilters } from "@/lib/data/songs";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const params = request.nextUrl.searchParams;
  const genre = params.get("genre") ?? undefined;
  const mood = params.get("mood") ?? undefined;
  const hiddenGem = params.get("hiddenGem");
  const emerging = params.get("emerging");
  const maxPopularity = params.get("maxPopularity");
  const limit = params.get("limit");

  try {
    const songs = await getSongsByFilters({
      genre,
      mood,
      hiddenGem: hiddenGem === null ? undefined : hiddenGem === "true",
      emerging: emerging === null ? undefined : emerging === "true",
      maxPopularity: maxPopularity ? parseInt(maxPopularity, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return NextResponse.json({
      count: songs.length,
      songs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Query failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

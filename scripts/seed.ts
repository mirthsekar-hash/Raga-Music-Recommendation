#!/usr/bin/env tsx
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { ArtistSeedSchema, SongSeedSchema } from "./schemas/seed";
import { loadEnv } from "./lib/load-env";

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
      "Add them to .env or .env.local and save the file before running seed.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function readSeed<T>(filename: string): T {
  const path = resolve(process.cwd(), "data", filename);
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

async function main() {
  const artistsRaw = readSeed<unknown[]>("artists.seed.json");
  const songsRaw = readSeed<unknown[]>("songs.seed.json");

  const artists = ArtistSeedSchema.array().parse(artistsRaw);
  const songs = SongSeedSchema.array().parse(songsRaw);

  const artistIds = new Set(artists.map((a) => a.id));
  const orphans = songs.filter((s) => !artistIds.has(s.artist_id));
  if (orphans.length > 0) {
    console.error(`Found ${orphans.length} songs with missing artist FK`);
    process.exit(1);
  }

  console.log(`Seeding ${artists.length} artists and ${songs.length} songs...`);

  const artistRows = artists.map((a) => ({
    id: a.id,
    name: a.name,
    genres: a.genres,
    similar_artists: a.similar_artists,
    bio: a.bio ?? null,
  }));

  const { error: artistError } = await supabase
    .from("artists")
    .upsert(artistRows, { onConflict: "id" });

  if (artistError) {
    console.error("Artist upsert failed:", artistError.message);
    process.exit(1);
  }

  const songRows = songs.map((s) => ({
    id: s.id,
    song_name: s.song_name,
    artist_id: s.artist_id,
    genre: s.genre,
    mood: s.mood,
    popularity: s.popularity,
    emerging_artist_flag: s.emerging_artist_flag,
    hidden_gem_flag: s.hidden_gem_flag,
    community_buzz_score: s.community_buzz_score,
    album_art_url: s.album_art_url ?? null,
    audio_preview_url: s.audio_preview_url ?? null,
  }));

  const batchSize = 50;
  for (let i = 0; i < songRows.length; i += batchSize) {
    const batch = songRows.slice(i, i + batchSize);
    const { error: songError } = await supabase
      .from("songs")
      .upsert(batch, { onConflict: "id" });

    if (songError) {
      console.error(`Song upsert failed at batch ${i}:`, songError.message);
      process.exit(1);
    }
  }

  const { count: artistCount } = await supabase
    .from("artists")
    .select("*", { count: "exact", head: true });
  const { count: songCount } = await supabase
    .from("songs")
    .select("*", { count: "exact", head: true });

  console.log(`✓ Seeded successfully: ${artistCount} artists, ${songCount} songs in Supabase`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

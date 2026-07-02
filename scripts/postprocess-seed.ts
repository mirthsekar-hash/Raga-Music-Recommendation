#!/usr/bin/env tsx
import { writeFileSync } from "fs";
import { resolve } from "path";
import {
  ArtistSeedSchema,
  SongSeedSchema,
  type SongSeed,
} from "./schemas/seed";
import {
  calibratePopularity,
  capEmergingMix,
  capHiddenGemMix,
  enforceDiscoveryMix,
  enforceEmergingMix,
  spreadBuzzScores,
} from "./lib/calibrate-dataset";
import { readJsonFile } from "./lib/load-env";
import { SeedConfigSchema } from "./schemas/seed";

const genreMoodMap = readJsonFile<Record<string, string[]>>("data/genre-mood-map.json");
const config = SeedConfigSchema.parse(readJsonFile("data/seed-config.json"));

function ensureGenreCoverage(songs: SongSeed[]): SongSeed[] {
  const present = new Set(songs.map((s) => s.genre));
  const missing = config.genres.filter((g) => !present.has(g));
  if (!missing.length) return songs;

  const donors = songs
    .filter((s) => s.genre === "indie" || s.genre === "electronic")
    .sort((a, b) => b.popularity - a.popularity);

  const updated = [...songs];
  let donorIdx = 0;

  for (const genre of missing) {
    for (let i = 0; i < 3 && donorIdx < donors.length; i++) {
      const donor = donors[donorIdx++];
      const idx = updated.findIndex((s) => s.id === donor.id);
      if (idx >= 0) {
        updated[idx] = {
          ...updated[idx],
          genre,
          mood: (genreMoodMap[genre] ?? ["chill", "introspective"]).slice(0, 2),
        };
      }
    }
  }

  return updated;
}

function printQaReport(songs: SongSeed[]): boolean {
  const genres = new Set(songs.map((s) => s.genre));
  const hiddenGems = songs.filter((s) => s.hidden_gem_flag).length;
  const emerging = songs.filter((s) => s.emerging_artist_flag).length;
  const popularities = songs.map((s) => s.popularity);
  const buzz = songs.map((s) => s.community_buzz_score);

  console.log(`Songs: ${songs.length} | Genres: ${genres.size}`);
  console.log(`Hidden gems: ${((hiddenGems / songs.length) * 100).toFixed(0)}%`);
  console.log(`Emerging: ${((emerging / songs.length) * 100).toFixed(0)}%`);
  console.log(`Popularity: ${Math.min(...popularities)}–${Math.max(...popularities)}`);

  return (
    songs.length >= 180 &&
    genres.size >= 12 &&
    hiddenGems / songs.length >= 0.2 &&
    emerging / songs.length >= 0.15 &&
    emerging / songs.length <= 0.25
  );
}

function main() {
  const artists = ArtistSeedSchema.array().parse(readJsonFile("data/artists.seed.json"));
  let songs = SongSeedSchema.array().parse(readJsonFile("data/songs.seed.json"));

  songs = ensureGenreCoverage(songs);
  songs = calibratePopularity(songs);
  songs = spreadBuzzScores(songs);
  songs = enforceDiscoveryMix(songs, config);
  songs = capHiddenGemMix(songs, config.discoveryMix.hiddenGemTargetPct + 0.05);
  songs = enforceEmergingMix(songs, config.discoveryMix.emergingArtistTargetPct);
  songs = capEmergingMix(songs, config.discoveryMix.emergingArtistTargetPct);

  const ok = printQaReport(songs);
  writeFileSync(resolve(process.cwd(), "data/songs.seed.json"), JSON.stringify(songs, null, 2));
  writeFileSync(resolve(process.cwd(), "data/artists.seed.json"), JSON.stringify(artists, null, 2));
  console.log(ok ? "✓ Post-process complete" : "⚠ Post-process done with QA warnings");
  process.exit(ok ? 0 : 1);
}

main();

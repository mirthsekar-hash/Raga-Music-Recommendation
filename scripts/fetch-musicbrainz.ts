#!/usr/bin/env tsx
import { writeFileSync } from "fs";
import { resolve } from "path";
import { v5 as uuidv5 } from "uuid";
import {
  ArtistSeedSchema,
  SeedConfigSchema,
  SongSeedSchema,
  type ArtistSeed,
  type SeedConfig,
  type SongSeed,
} from "./schemas/seed";
import { getCoverArtUrl } from "./lib/cover-art";
import {
  calibratePopularity,
  capEmergingMix,
  capHiddenGemMix,
  enforceDiscoveryMix,
  enforceEmergingMix,
  spreadBuzzScores,
} from "./lib/calibrate-dataset";
import { deriveSignals } from "./lib/derive-signals";
import { readJsonFile } from "./lib/load-env";
import { mapTagsToGenre } from "./lib/genre-map";
import {
  artistActiveYears,
  extractTags,
  getArtist,
  getReleaseMbid,
  parseReleaseYear,
  searchArtist,
  searchRecordings,
} from "./lib/musicbrainz-client";
import { resolveSimilarArtists } from "./lib/similar-artists";
import { RAGA_NAMESPACE } from "./lib/utils";

interface CliArgs {
  configPath: string;
  validateOnly: boolean;
  dryRun: boolean;
  limit?: number;
  verbose: boolean;
  skipCoverArt: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const getFlag = (name: string) => args.includes(name);
  const getValue = (name: string) => {
    const idx = args.indexOf(name);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  return {
    configPath: getValue("--config") ?? "data/seed-config.json",
    validateOnly: getFlag("--validate-only"),
    dryRun: getFlag("--dry-run"),
    limit: getValue("--limit") ? parseInt(getValue("--limit")!, 10) : undefined,
    verbose: getFlag("--verbose"),
    skipCoverArt: getFlag("--skip-cover-art"),
  };
}

function capSongsPerArtist(songs: SongSeed[], max: number): SongSeed[] {
  const counts = new Map<string, number>();
  const result: SongSeed[] = [];

  for (const song of songs) {
    const count = counts.get(song.artist_id) ?? 0;
    if (count >= max) continue;
    counts.set(song.artist_id, count + 1);
    result.push(song);
  }

  return result;
}

function rebalanceGenreQuotas(songs: SongSeed[], config: SeedConfig): SongSeed[] {
  const byGenre = new Map<string, SongSeed[]>();
  for (const genre of config.genres) {
    byGenre.set(genre, songs.filter((s) => s.genre === genre));
  }

  const balanced: SongSeed[] = [];
  const perGenre = Math.ceil(config.targetSongCount / config.genres.length);

  for (let round = 0; round < perGenre; round++) {
    for (const genre of config.genres) {
      const list = byGenre.get(genre) ?? [];
      if (list[round]) balanced.push(list[round]);
    }
  }

  const picked = new Set(balanced.map((s) => s.id));
  const remainder = songs.filter((s) => !picked.has(s.id));
  balanced.push(...remainder);

  return balanced;
}

function printQaReport(songs: SongSeed[], artists: ArtistSeed[]): boolean {
  const genres = new Set(songs.map((s) => s.genre));
  const hiddenGems = songs.filter((s) => s.hidden_gem_flag).length;
  const emerging = songs.filter((s) => s.emerging_artist_flag).length;
  const popularities = songs.map((s) => s.popularity);
  const buzz = songs.map((s) => s.community_buzz_score);
  const withArt = songs.filter((s) => s.album_art_url).length;

  const minPop = Math.min(...popularities);
  const maxPop = Math.max(...popularities);
  const minBuzz = Math.min(...buzz);
  const maxBuzz = Math.max(...buzz);

  console.log(`\n--- QA Report ---`);
  console.log(`✓ Songs: ${songs.length} | Artists: ${artists.length} | Genres: ${genres.size}`);
  console.log(
    `✓ Hidden gems: ${((hiddenGems / songs.length) * 100).toFixed(0)}% (${hiddenGems}/${songs.length})`,
  );
  console.log(
    `✓ Emerging artists: ${((emerging / songs.length) * 100).toFixed(0)}% (${emerging}/${songs.length})`,
  );
  console.log(`✓ Popularity: ${minPop}–${maxPop} | Buzz: ${minBuzz.toFixed(2)}–${maxBuzz.toFixed(2)}`);
  console.log(
    `${withArt / songs.length >= 0.8 ? "✓" : "⚠"} Album art coverage: ${((withArt / songs.length) * 100).toFixed(0)}%`,
  );

  const hardFails: string[] = [];
  if (songs.length < 180 || songs.length > 220) hardFails.push(`Song count ${songs.length} outside 180–220`);
  if (genres.size < 12) hardFails.push(`Only ${genres.size} genres (need ≥12)`);
  if (hiddenGems / songs.length < 0.2 || hiddenGems / songs.length > 0.3)
    hardFails.push(`Hidden gem % out of range`);
  if (emerging / songs.length < 0.15 || emerging / songs.length > 0.25)
    hardFails.push(`Emerging artist % out of range`);
  if (minPop >= 20 || maxPop <= 70) hardFails.push(`Popularity range too narrow`);
  if (minBuzz >= 0.3 || maxBuzz <= 0.8) hardFails.push(`Buzz range too narrow`);

  const mbids = new Set(songs.map((s) => s.musicbrainz_recording_mbid));
  if (mbids.size !== songs.length) hardFails.push("Duplicate recording MBIDs");

  if (hardFails.length) {
    console.error("\n✗ QA failures:");
    hardFails.forEach((f) => console.error(`  - ${f}`));
    return false;
  }

  console.log("\n✓ All hard QA checks passed");
  return true;
}

async function fetchDataset(config: SeedConfig, args: CliArgs) {
  const targetCount = args.limit ?? config.targetSongCount;
  const genreMoodMap = readJsonFile<Record<string, string[]>>("data/genre-mood-map.json");
  const hiddenGemOverrides = new Set(config.hiddenGemOverrides);

  const artistMap = new Map<string, ArtistSeed>();
  const songs: SongSeed[] = [];
  const seenRecordingMbids = new Set<string>();

  const artistQueue: Array<{ name: string; genre: string }> = [];
  const genreArtistLists = config.genres.map((genre) => ({
    genre,
    names: [
      ...(config.anchorArtists[genre] ?? []),
      ...(config.overflowArtists?.[genre] ?? []),
    ],
  }));
  const maxArtists = Math.max(...genreArtistLists.map((g) => g.names.length), 0);
  for (let i = 0; i < maxArtists; i++) {
    for (const { genre, names } of genreArtistLists) {
      if (names[i]) artistQueue.push({ name: names[i], genre });
    }
  }

  for (const { name, genre } of artistQueue) {
    if (songs.length >= targetCount) break;

    if (args.verbose) console.log(`Fetching artist: ${name} (${genre})`);
    else console.log(`  … ${name}`);

    const searchResult = await searchArtist(name);
    if (!searchResult) {
      console.warn(`  ⚠ Artist not found: ${name}`);
      continue;
    }

    const mbArtist = (await getArtist(searchResult.id)) ?? searchResult;
    const artistTags = extractTags(mbArtist.tags);
    const mappedGenre = mapTagsToGenre(artistTags, genre);
    const activeYears = artistActiveYears(mbArtist);

    const artistId = uuidv5(mbArtist.id, RAGA_NAMESPACE);
    if (!artistMap.has(artistId)) {
      artistMap.set(artistId, {
        id: artistId,
        name: mbArtist.name,
        genres: [...new Set([mappedGenre, genre])],
        similar_artists: [],
        bio: mbArtist.disambiguation,
        source: "musicbrainz",
        musicbrainz_artist_mbid: mbArtist.id,
        artist_popularity_proxy: 0,
        emerging_artist_flag: false,
      });
    }

    const recordings = await searchRecordings(mbArtist.name, 25);
    let artistSongCount = songs.filter((s) => s.artist_id === artistId).length;

    for (const rec of recordings) {
      if (songs.length >= targetCount) break;
      if (artistSongCount >= config.maxSongsPerArtist) break;
      if (seenRecordingMbids.has(rec.id)) continue;

      const fullRecording = rec;
      const recordingTags = extractTags(fullRecording.tags);
      const releaseYear = parseReleaseYear(fullRecording);
      const songGenre = genre;

      const signals = deriveSignals(
        {
          recordingTags,
          artistTags,
          genre: songGenre,
          releaseYear,
          artistActiveYears: activeYears,
          forceHiddenGem: hiddenGemOverrides.has(fullRecording.title),
        },
        genreMoodMap,
      );

      const releaseMbid = getReleaseMbid(fullRecording);
      let albumArtUrl: string | undefined;
      if (!args.skipCoverArt && releaseMbid && artistSongCount === 0) {
        albumArtUrl = await getCoverArtUrl(releaseMbid);
      }

      const songId = uuidv5(fullRecording.id, RAGA_NAMESPACE);
      const artist = artistMap.get(artistId)!;
      artist.artist_popularity_proxy = signals.artistPopularityProxy;
      artist.emerging_artist_flag = signals.emergingArtistFlag;

      songs.push({
        id: songId,
        song_name: fullRecording.title,
        artist_id: artistId,
        artist_name: artist.name,
        genre: songGenre,
        mood: signals.mood,
        popularity: signals.popularity,
        emerging_artist_flag: signals.emergingArtistFlag,
        hidden_gem_flag: signals.hiddenGemFlag,
        community_buzz_score: signals.communityBuzzScore,
        album_art_url: albumArtUrl,
        source: "musicbrainz",
        musicbrainz_recording_mbid: fullRecording.id,
        musicbrainz_release_mbid: releaseMbid,
      });

      seenRecordingMbids.add(fullRecording.id);
      artistSongCount++;
    }
  }

  let processedSongs = capSongsPerArtist(songs, config.maxSongsPerArtist);
  processedSongs = rebalanceGenreQuotas(processedSongs, config);
  processedSongs = processedSongs.slice(0, targetCount);
  processedSongs = calibratePopularity(processedSongs);
  processedSongs = spreadBuzzScores(processedSongs);
  processedSongs = enforceDiscoveryMix(processedSongs, config);
  processedSongs = capHiddenGemMix(processedSongs, config.discoveryMix.hiddenGemTargetPct + 0.05);
  processedSongs = enforceEmergingMix(processedSongs, config.discoveryMix.emergingArtistTargetPct);
  processedSongs = capEmergingMix(processedSongs, config.discoveryMix.emergingArtistTargetPct);

  const artists = [...artistMap.values()].filter((a) =>
    processedSongs.some((s) => s.artist_id === a.id),
  );

  for (const artist of artists) {
    artist.similar_artists = resolveSimilarArtists(
      artist.name,
      artist.genres[0],
      artists,
    );
  }

  return { artists, songs: processedSongs };
}

async function main() {
  const args = parseArgs();

  if (args.validateOnly) {
    const artists = readJsonFile<unknown[]>("data/artists.seed.json");
    const songs = readJsonFile<unknown[]>("data/songs.seed.json");
    const validatedArtists = ArtistSeedSchema.array().parse(artists);
    const validatedSongs = SongSeedSchema.array().parse(songs);
    const ok = printQaReport(validatedSongs, validatedArtists);
    process.exit(ok ? 0 : 1);
  }

  const config = SeedConfigSchema.parse(readJsonFile(args.configPath));
  console.log(`Fetching up to ${args.limit ?? config.targetSongCount} songs from MusicBrainz...`);
  console.log("(Rate limited to 1 req/sec — this may take several minutes)\n");

  const { artists, songs } = await fetchDataset(config, args);
  const validatedArtists = ArtistSeedSchema.array().parse(artists);
  const validatedSongs = SongSeedSchema.array().parse(songs);

  const qaOk = printQaReport(validatedSongs, validatedArtists);

  if (args.dryRun) {
    console.log("\nDry run — files not written");
    process.exit(qaOk ? 0 : 1);
  }

  if (!args.dryRun) {
    writeFileSync(
      resolve(process.cwd(), "data/artists.seed.json"),
      JSON.stringify(validatedArtists, null, 2),
    );
    writeFileSync(
      resolve(process.cwd(), "data/songs.seed.json"),
      JSON.stringify(validatedSongs, null, 2),
    );
    console.log("\nWrote data/artists.seed.json and data/songs.seed.json");
  }

  process.exit(qaOk ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

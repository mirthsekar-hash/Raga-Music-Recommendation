#!/usr/bin/env tsx
import { defaultTasteProfile } from "../lib/data/profile-default";
import { rankSongs, averageCulturalScore, countDiscoveryFlags } from "../lib/scoring/rank";
import {
  computeCulturalScore,
  computeFinalScore,
  computePersonalScore,
  scoreSong,
} from "../lib/scoring/scores";
import { computeIsTrending } from "../lib/scoring/trending";
import type { Artist, Song, SongWithArtist } from "../types";
import type { DiscoveryIntent } from "../lib/intent/schema";

const SESSION_ID = "11111111-1111-1111-1111-111111111111";

function makeArtist(overrides: Partial<Artist> = {}): Artist {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Test Artist",
    genres: ["indie"],
    similar_artists: [],
    bio: null,
    ...overrides,
  };
}

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    song_name: "Alpha Track",
    artist_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    genre: "indie",
    mood: ["chill"],
    popularity: 50,
    emerging_artist_flag: false,
    hidden_gem_flag: false,
    community_buzz_score: 0.5,
    album_art_url: null,
    audio_preview_url: null,
    ...overrides,
  };
}

function withArtist(song: Song, artist: Artist): SongWithArtist {
  return { ...song, artists: artist };
}

function makeIntent(overrides: Partial<DiscoveryIntent> = {}): DiscoveryIntent {
  return {
    intent: "mood_based",
    explorationLevel: "balanced",
    ...overrides,
  };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`✓ ${label}`);
    passed++;
  } else {
    console.error(`✗ ${label}`);
    failed++;
  }
}

function main() {
  console.log("=== Phase 3 Scoring Unit Tests ===\n");

  const profile = defaultTasteProfile(SESSION_ID);
  const artist = makeArtist();
  const song = makeSong();
  const intent = makeIntent({ mood: ["chill"], genre: ["indie"] });

  // P3-06: empty profile does not crash
  const personal = computePersonalScore(song, artist, intent, profile, null, new Set());
  assert(personal.score >= 0 && personal.score <= 1, "empty profile personal score in range");

  // P3-09: popularity 0 does not divide by zero
  const zeroPop = computeCulturalScore(makeSong({ popularity: 0 }));
  assert(zeroPop.score >= 0 && zeroPop.score <= 1, "popularity 0 cultural score valid");

  const scored = scoreSong(song, artist, intent, profile, null, new Set());
  assert(scored.finalScore >= 0 && scored.finalScore <= 1, "final score in range");

  // P3-04: deterministic tie-breaker
  const artistB = makeArtist({
    id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    name: "Beta Artist",
  });
  const tiedA = withArtist(
    makeSong({ id: "dddddddd-dddd-dddd-dddd-dddddddddddd", song_name: "Zulu", community_buzz_score: 0.6 }),
    artist,
  );
  const tiedB = withArtist(
    makeSong({
      id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
      song_name: "Alpha",
      community_buzz_score: 0.6,
      artist_id: artistB.id,
    }),
    artistB,
  );
  const tieIntent = makeIntent({ intent: "general_discovery" });
  const run1 = rankSongs([tiedA, tiedB], tieIntent, profile, { limit: 2 });
  const run2 = rankSongs([tiedB, tiedA], tieIntent, profile, { limit: 2 });
  assert(
    run1.candidates[0]?.song.song_name === run2.candidates[0]?.song.song_name,
    "tie-breaker is deterministic (song_name asc)",
  );

  // P3-08: dedupe by song id
  const dup = withArtist(song, artist);
  const deduped = rankSongs([dup, dup, dup], intent, profile, { limit: 8 });
  assert(deduped.candidates.length === 1, "deduplicates same song id");

  // P3-05 / adventurous vs conservative cultural surfacing
  const hidden = withArtist(
    makeSong({
      id: "ffffffff-ffff-ffff-ffff-ffffffffffff",
      song_name: "Hidden Gem",
      hidden_gem_flag: true,
      emerging_artist_flag: true,
      popularity: 10,
      community_buzz_score: 0.9,
    }),
    artist,
  );
  const mainstream = withArtist(
    makeSong({
      id: "10101010-1010-1010-1010-101010101010",
      song_name: "Mainstream Hit",
      hidden_gem_flag: false,
      emerging_artist_flag: false,
      popularity: 95,
      community_buzz_score: 0.2,
    }),
    artist,
  );
  const pool = [hidden, mainstream];
  const conservative = rankSongs(pool, makeIntent({ explorationLevel: "conservative", intent: "general_discovery" }), profile);
  const adventurous = rankSongs(pool, makeIntent({ explorationLevel: "adventurous", intent: "general_discovery" }), profile);
  assert(
    averageCulturalScore(adventurous.candidates) >= averageCulturalScore(conservative.candidates),
    "adventurous ranks higher avg cultural score than conservative",
  );
  const advFlags = countDiscoveryFlags(adventurous.candidates);
  const conFlags = countDiscoveryFlags(conservative.candidates);
  assert(
    advFlags.hiddenGems + advFlags.emerging >= conFlags.hiddenGems + conFlags.emerging,
    "adventurous surfaces more discovery flags",
  );

  // Weights from config shift with exploration level
  const balancedFinal = computeFinalScore(0.2, 0.9, "balanced");
  const adventurousFinal = computeFinalScore(0.2, 0.9, "adventurous");
  assert(adventurousFinal > balancedFinal, "adventurous weighting boosts cultural component");

  // Trending badge signal
  const trendingSong = makeSong({
    community_buzz_score: 0.8,
    popularity: 62,
    hidden_gem_flag: false,
  });
  assert(computeIsTrending(trendingSong, 0.8), "high buzz non-gem qualifies as trending");
  const trendingCultural = computeCulturalScore(trendingSong);
  assert(trendingCultural.signals.isTrending, "cultural score exposes isTrending");

  const hiddenTrendingBuzz = makeSong({
    community_buzz_score: 0.9,
    hidden_gem_flag: true,
  });
  assert(
    !computeIsTrending(hiddenTrendingBuzz, 0.9),
    "hidden gems are not labeled trending",
  );

  const rankedTrending = rankSongs(
    [withArtist(trendingSong, artist)],
    makeIntent({ intent: "trending" }),
    profile,
  );
  assert(
    rankedTrending.candidates[0]?.matchedSignals.isTrending === true,
    "ranked candidates include isTrending",
  );

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main();

import { z } from "zod";

export const ArtistSeedSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  genres: z.array(z.string()).min(1),
  similar_artists: z.array(z.string()).default([]),
  bio: z.string().optional(),
  source: z.literal("musicbrainz"),
  musicbrainz_artist_mbid: z.string().uuid(),
  artist_popularity_proxy: z.number().int().min(0).max(100),
  emerging_artist_flag: z.boolean(),
});

export const SongSeedSchema = z.object({
  id: z.string().uuid(),
  song_name: z.string().min(1),
  artist_id: z.string().uuid(),
  artist_name: z.string().min(1),
  genre: z.string().min(1),
  mood: z.array(z.string()).min(1).max(3),
  popularity: z.number().int().min(0).max(100),
  emerging_artist_flag: z.boolean(),
  hidden_gem_flag: z.boolean(),
  community_buzz_score: z.number().min(0).max(1),
  album_art_url: z.string().url().optional(),
  audio_preview_url: z.string().url().optional(),
  source: z.literal("musicbrainz"),
  musicbrainz_recording_mbid: z.string().uuid(),
  musicbrainz_release_mbid: z.string().uuid().optional(),
});

export const SeedConfigSchema = z.object({
  targetSongCount: z.number().int().positive(),
  maxSongsPerArtist: z.number().int().positive().default(3),
  songsPerGenre: z.object({ min: z.number(), max: z.number() }),
  genres: z.array(z.string()),
  anchorArtists: z.record(z.array(z.string())),
  overflowArtists: z.record(z.array(z.string())).optional(),
  discoveryMix: z.object({
    hiddenGemTargetPct: z.number(),
    emergingArtistTargetPct: z.number(),
    mainstreamAnchorPct: z.number(),
  }),
  hiddenGemOverrides: z.array(z.string()).default([]),
});

export type ArtistSeed = z.infer<typeof ArtistSeedSchema>;
export type SongSeed = z.infer<typeof SongSeedSchema>;
export type SeedConfig = z.infer<typeof SeedConfigSchema>;

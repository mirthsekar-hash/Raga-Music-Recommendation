import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Song, SongFilters, SongWithArtist } from "@/types";

export async function getSongById(id: string): Promise<SongWithArtist | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*, artists(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as SongWithArtist | null;
}

export async function getSongsByArtistId(
  artistId: string,
  limit = 30,
): Promise<SongWithArtist[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*, artists(*)")
    .eq("artist_id", artistId)
    .limit(Math.min(limit, 100));

  if (error) throw new Error(error.message);
  return (data ?? []) as SongWithArtist[];
}

export async function getSongsByArtistName(
  name: string,
  limit = 30,
): Promise<SongWithArtist[]> {
  const supabase = createAdminClient();
  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .select("id")
    .ilike("name", name)
    .limit(1)
    .maybeSingle();

  if (artistError) throw new Error(artistError.message);
  if (!artist) return [];

  return getSongsByArtistId(artist.id, limit);
}

export async function getSongsByArtistIds(
  artistIds: string[],
  limit = 50,
): Promise<SongWithArtist[]> {
  if (!artistIds.length) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*, artists(*)")
    .in("artist_id", artistIds)
    .limit(Math.min(limit, 100));

  if (error) throw new Error(error.message);
  return (data ?? []) as SongWithArtist[];
}

export async function getAllSongs(limit = 100): Promise<SongWithArtist[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("songs")
    .select("*, artists(*)")
    .order("popularity", { ascending: false })
    .limit(Math.min(limit, 100));

  if (error) throw new Error(error.message);
  return (data ?? []) as SongWithArtist[];
}

export async function getSongsByFilters(filters: SongFilters = {}): Promise<SongWithArtist[]> {
  const supabase = createAdminClient();
  const limit = Math.min(filters.limit ?? 50, 100);

  let query = supabase
    .from("songs")
    .select("*, artists(*)")
    .order("popularity", { ascending: false })
    .limit(limit);

  if (filters.genre) {
    query = query.eq("genre", filters.genre);
  }
  if (filters.mood) {
    query = query.overlaps("mood", [filters.mood]);
  }
  if (filters.hiddenGem !== undefined) {
    query = query.eq("hidden_gem_flag", filters.hiddenGem);
  }
  if (filters.emerging !== undefined) {
    query = query.eq("emerging_artist_flag", filters.emerging);
  }
  if (filters.maxPopularity !== undefined) {
    query = query.lte("popularity", filters.maxPopularity);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as SongWithArtist[];
}

export async function getSongsByIds(ids: string[]): Promise<Song[]> {
  if (!ids.length) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("songs").select("*").in("id", ids);

  if (error) throw new Error(error.message);
  return (data ?? []) as Song[];
}

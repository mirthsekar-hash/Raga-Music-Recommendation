import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Artist } from "@/types";

export async function getArtistById(id: string): Promise<Artist | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("artists").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(error.message);
  return data as Artist | null;
}

export async function getSimilarArtists(artistName: string): Promise<Artist[]> {
  const supabase = createAdminClient();
  const { data: artist, error } = await supabase
    .from("artists")
    .select("*")
    .ilike("name", artistName)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!artist) return [];

  const similarNames = (artist as Artist).similar_artists ?? [];
  if (!similarNames.length) return [];

  const { data: similar, error: similarError } = await supabase
    .from("artists")
    .select("*")
    .in("name", similarNames);

  if (similarError) throw new Error(similarError.message);
  return (similar ?? []) as Artist[];
}

export async function getArtistsByGenre(genre: string, limit = 20): Promise<Artist[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .contains("genres", [genre])
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as Artist[];
}

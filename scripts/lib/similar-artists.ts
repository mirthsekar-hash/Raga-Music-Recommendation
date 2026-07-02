export function resolveSimilarArtists(
  artistName: string,
  genre: string,
  allArtists: Array<{ name: string; genres: string[] }>,
  curatorSimilar: string[] = [],
): string[] {
  const similar = new Set<string>();

  for (const name of curatorSimilar) {
    if (name !== artistName) similar.add(name);
  }

  for (const other of allArtists) {
    if (other.name === artistName) continue;
    if (other.genres.includes(genre)) {
      similar.add(other.name);
    }
    if (similar.size >= 3) break;
  }

  return [...similar].slice(0, 3);
}

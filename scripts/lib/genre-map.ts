const TAG_TO_GENRE: Record<string, string> = {
  indie: "indie",
  "indie rock": "indie",
  "indie pop": "indie",
  "indie folk": "indie",
  electronic: "electronic",
  electronica: "electronic",
  house: "electronic",
  techno: "electronic",
  downtempo: "electronic",
  idm: "electronic",
  "lo-fi": "lo-fi",
  chillhop: "lo-fi",
  "instrumental hip hop": "lo-fi",
  jazz: "jazz",
  bebop: "jazz",
  "smooth jazz": "jazz",
  folk: "folk",
  "singer-songwriter": "folk",
  acoustic: "folk",
  "hip hop": "hip-hop",
  rap: "hip-hop",
  trap: "hip-hop",
  "r&b": "r-n-b",
  "r and b": "r-n-b",
  "neo soul": "r-n-b",
  soul: "soul",
  rock: "rock",
  "alternative rock": "rock",
  punk: "rock",
  ambient: "ambient",
  drone: "ambient",
  "new age": "ambient",
  pop: "pop",
  "dance pop": "pop",
  synthpop: "pop",
  metal: "metal",
  "heavy metal": "metal",
  "black metal": "metal",
  classical: "classical",
  orchestral: "classical",
  latin: "latin",
  reggaeton: "latin",
  salsa: "latin",
  world: "world",
  afrobeat: "world",
  celtic: "world",
};

const NICHE_TAGS = new Set([
  "indie",
  "underground",
  "bedroom",
  "experimental",
  "lo-fi",
  "emo",
  "lofi",
]);

export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim();
}

export function mapTagsToGenre(tags: string[], fallbackGenre: string): string {
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (TAG_TO_GENRE[normalized]) {
      return TAG_TO_GENRE[normalized];
    }
  }
  return fallbackGenre;
}

export function hasNicheTag(tags: string[]): boolean {
  return tags.some((tag) => NICHE_TAGS.has(normalizeTag(tag)));
}

export const MOOD_KEYWORDS: Record<string, string> = {
  energetic: "energetic",
  energy: "energetic",
  upbeat: "upbeat",
  chill: "chill",
  relaxing: "chill",
  sad: "melancholic",
  melancholic: "melancholic",
  dreamy: "dreamy",
  dark: "dark",
  aggressive: "aggressive",
  happy: "upbeat",
  emotional: "introspective",
};

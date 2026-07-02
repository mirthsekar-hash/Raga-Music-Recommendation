import { sleep } from "./utils";

const USER_AGENT =
  process.env.MUSICBRAINZ_USER_AGENT ??
  "RagaDiscoveryCompanion/0.1 (https://github.com/raga-discovery; dev@raga.local)";

let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < 1100) {
    await sleep(1100 - elapsed);
  }
  lastRequestAt = Date.now();
}

async function fetchWithRetry(url: string, init?: RequestInit): Promise<Response> {
  let delay = 2000;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await throttle();
      const response = await fetch(url, {
        ...init,
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          ...init?.headers,
        },
      });

      if (response.status === 503) {
        if (attempt < 4) {
          await sleep(delay);
          delay *= 2;
          continue;
        }
      }

      return response;
    } catch (error) {
      if (attempt < 4) {
        console.warn(`  Network error, retrying in ${delay}ms...`);
        await sleep(delay);
        delay *= 2;
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed to fetch ${url}`);
}

export interface MbTag {
  name: string;
  count: number;
}

export interface MbArtist {
  id: string;
  name: string;
  tags?: MbTag[];
  "life-span"?: { begin?: string; end?: string };
  disambiguation?: string;
}

export interface MbRecording {
  id: string;
  title: string;
  tags?: MbTag[];
  "first-release-date"?: string;
  releases?: Array<{ id: string; date?: string }>;
}

export async function searchArtist(name: string): Promise<MbArtist | null> {
  const query = encodeURIComponent(`artist:"${name}"`);
  const url = `https://musicbrainz.org/ws/2/artist?query=${query}&limit=5&fmt=json`;
  const response = await fetchWithRetry(url);
  if (!response.ok) return null;

  const data = (await response.json()) as { artists?: MbArtist[] };
  if (!data.artists?.length) return null;

  const exact = data.artists.find(
    (a) => a.name.toLowerCase() === name.toLowerCase(),
  );
  return exact ?? data.artists[0];
}

export async function getArtist(mbid: string): Promise<MbArtist | null> {
  const url = `https://musicbrainz.org/ws/2/artist/${mbid}?inc=tags&fmt=json`;
  const response = await fetchWithRetry(url);
  if (!response.ok) return null;
  return (await response.json()) as MbArtist;
}

export async function searchRecordings(
  artistName: string,
  limit = 25,
): Promise<MbRecording[]> {
  const query = encodeURIComponent(`artist:"${artistName}"`);
  const url = `https://musicbrainz.org/ws/2/recording?query=${query}&limit=${limit}&fmt=json`;
  const response = await fetchWithRetry(url);
  if (!response.ok) return [];

  const data = (await response.json()) as { recordings?: MbRecording[] };
  return data.recordings ?? [];
}

export async function getRecording(mbid: string): Promise<MbRecording | null> {
  const url = `https://musicbrainz.org/ws/2/recording/${mbid}?inc=tags+releases&fmt=json`;
  const response = await fetchWithRetry(url);
  if (!response.ok) return null;
  return (await response.json()) as MbRecording;
}

export function extractTags(tags?: MbTag[]): string[] {
  if (!tags?.length) return [];
  return tags
    .sort((a, b) => b.count - a.count)
    .map((t) => t.name.toLowerCase());
}

export function parseReleaseYear(recording: MbRecording): number | undefined {
  const date =
    recording["first-release-date"] ??
    recording.releases?.find((r) => r.date)?.date;
  if (!date) return undefined;
  const year = parseInt(date.slice(0, 4), 10);
  return Number.isNaN(year) ? undefined : year;
}

export function artistActiveYears(artist: MbArtist): number | undefined {
  const begin = artist["life-span"]?.begin;
  if (!begin) return undefined;
  const startYear = parseInt(begin.slice(0, 4), 10);
  if (Number.isNaN(startYear)) return undefined;
  return new Date().getFullYear() - startYear;
}

export function getReleaseMbid(recording: MbRecording): string | undefined {
  return recording.releases?.[0]?.id;
}

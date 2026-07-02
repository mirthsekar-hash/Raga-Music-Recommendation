import { sleep } from "./utils";

export async function getCoverArtUrl(releaseMbid?: string): Promise<string | undefined> {
  if (!releaseMbid) return undefined;

  try {
    await sleep(1100);
    const response = await fetch(
      `https://coverartarchive.org/release/${releaseMbid}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            process.env.MUSICBRAINZ_USER_AGENT ??
            "RagaDiscoveryCompanion/0.1 (https://github.com/raga-discovery; dev@raga.local)",
        },
        redirect: "follow",
      },
    );

    if (!response.ok) return undefined;

    const data = (await response.json()) as {
      images?: Array<{ front?: boolean; thumbnails?: { small?: string; large?: string } }>;
    };

    const front =
      data.images?.find((img) => img.front) ?? data.images?.[0];
    return front?.thumbnails?.large ?? front?.thumbnails?.small;
  } catch {
    return undefined;
  }
}

import "server-only";

import { generateWithQuota } from "@/lib/gemini/generate";

export { createGeminiClient } from "@/lib/gemini/sdk";

export async function pingGemini(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const text = await generateWithQuota({
      purpose: "health",
      prompt: "Reply with exactly: ok",
    });

    if (!text.trim().toLowerCase().includes("ok")) {
      return { ok: false, message: "Unexpected Gemini response" };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini connection failed";
    return { ok: false, message };
  }
}

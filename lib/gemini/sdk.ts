import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerEnv } from "@/lib/env";

export function createGeminiClient() {
  const env = getServerEnv();
  return new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

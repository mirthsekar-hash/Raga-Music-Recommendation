import { readFileSync } from "fs";
import { resolve } from "path";
import { config } from "dotenv";

export function loadEnv(): void {
  config({ path: resolve(process.cwd(), ".env.local") });
  config({ path: resolve(process.cwd(), ".env") });
}

export function readJsonFile<T>(relativePath: string): T {
  const fullPath = resolve(process.cwd(), relativePath);
  return JSON.parse(readFileSync(fullPath, "utf-8")) as T;
}

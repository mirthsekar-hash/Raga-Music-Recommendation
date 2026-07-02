#!/usr/bin/env tsx
/**
 * Ensures server-only secrets are not referenced from client components.
 * Run after `npm run build`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const CLIENT_CHUNK_DIR = join(ROOT, ".next", "static", "chunks");
const SECRET_PATTERNS = [
  /SUPABASE_SERVICE_ROLE_KEY/,
  /GEMINI_API_KEY/,
  /sk-[a-zA-Z0-9]{20,}/,
];

function walk(dir: string, files: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (entry.endsWith(".js")) files.push(full);
  }
  return files;
}

function main() {
  console.log("=== Secrets audit (client bundle) ===\n");

  const files = walk(CLIENT_CHUNK_DIR);
  if (!files.length) {
    console.error("No client chunks found. Run `npm run build` first.");
    process.exit(1);
  }

  const hits: Array<{ file: string; pattern: string }> = [];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        hits.push({ file, pattern: pattern.source });
      }
    }
  }

  if (hits.length) {
    console.error("Potential secret leakage in client bundle:");
    for (const hit of hits) {
      console.error(`  ${hit.file} matched ${hit.pattern}`);
    }
    process.exit(1);
  }

  console.log(`✓ Scanned ${files.length} client chunks — no secret patterns found.`);
}

main();

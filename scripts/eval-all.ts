#!/usr/bin/env tsx
/**
 * Runs all offline eval suites (no Gemini quota).
 * Use `npm run eval:intent -- --live` separately when you want LLM intent scoring.
 */
import { execSync } from "child_process";
import { resolve } from "path";

const scripts = ["eval-relevance.ts", "eval-intent.ts", "eval-explain.ts"];

console.log("=== Raga Eval Suite (offline) ===\n");

let totalFailed = 0;
const root = process.cwd();

for (const script of scripts) {
  const scriptPath = resolve(root, "scripts", script);
  try {
    execSync(`npx tsx "${scriptPath}"`, { stdio: "inherit", cwd: root });
  } catch {
    totalFailed++;
  }
}

console.log(
  `\n=== Eval suite complete: ${scripts.length - totalFailed}/${scripts.length} suites passed ===`,
);
process.exit(totalFailed > 0 ? 1 : 0);

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 5 * 60 * 1000;

let consecutiveFailures = 0;
let circuitOpenUntil = 0;

export class GeminiCircuitOpenError extends Error {
  constructor() {
    super(
      "AI narration is temporarily unavailable. Recommendations still work with template explanations.",
    );
    this.name = "GeminiCircuitOpenError";
  }
}

export function isGeminiCircuitOpen(): boolean {
  if (Date.now() < circuitOpenUntil) return true;
  if (circuitOpenUntil > 0 && Date.now() >= circuitOpenUntil) {
    circuitOpenUntil = 0;
    consecutiveFailures = 0;
  }
  return false;
}

export function recordGeminiSuccess(): void {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

export function recordGeminiFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + COOLDOWN_MS;
  }
}

export function getCircuitStatus(): { open: boolean; retryAfterMs: number } {
  const open = isGeminiCircuitOpen();
  return {
    open,
    retryAfterMs: open ? Math.max(0, circuitOpenUntil - Date.now()) : 0,
  };
}

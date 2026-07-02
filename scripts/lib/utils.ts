export const RAGA_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

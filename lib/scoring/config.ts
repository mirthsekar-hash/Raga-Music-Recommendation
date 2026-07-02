import type { ExplorationLevel } from "@/lib/intent/schema";

/** Tunable scoring weights — not hardcoded in rank logic. */
export const SCORING_CONFIG = {
  defaultLimit: 8,
  minDesiredResults: 6,
  maxLimit: 8,
  maxCandidatePool: 100,
  minPoolBeforeRelax: 12,
} as const;

/** Personal / cultural split shifts with exploration level (architecture: adventurous → 50/50). */
export const EXPLORATION_WEIGHTS: Record<
  ExplorationLevel,
  { personal: number; cultural: number }
> = {
  conservative: { personal: 0.8, cultural: 0.2 },
  balanced: { personal: 0.7, cultural: 0.3 },
  adventurous: { personal: 0.5, cultural: 0.5 },
};

/** Components for personal taste score (sum of weights = 1). */
export const PERSONAL_SIGNAL_WEIGHTS = {
  genreMatch: 0.35,
  moodMatch: 0.3,
  artistMatch: 0.25,
  profileGenre: 0.05,
  profileArtist: 0.05,
} as const;

/** Components for cultural discovery score (sum of weights = 1). */
export const CULTURAL_SIGNAL_WEIGHTS = {
  hiddenGem: 0.3,
  emerging: 0.25,
  communityBuzz: 0.25,
  inversePopularity: 0.2,
} as const;

export function getScoreWeights(explorationLevel: ExplorationLevel): {
  personal: number;
  cultural: number;
} {
  return EXPLORATION_WEIGHTS[explorationLevel];
}

#!/usr/bin/env tsx
import { templateChatReply, templateExplanation } from "../lib/explain/fallback";
import { assertExplanationGrounded } from "../lib/evals/grounding";
import type { DiscoveryIntent } from "../lib/intent/schema";
import type { Artist, RecommendationCandidate, Song } from "../types";
import { buildSummary, exitFromSummaries, printSummary } from "./lib/eval-runner";

function makeArtist(overrides: Partial<Artist> = {}): Artist {
  return {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    name: "Luna Vale",
    genres: ["indie"],
    similar_artists: ["Bon Iver", "Phoebe Bridgers"],
    bio: null,
    ...overrides,
  };
}

function makeSong(overrides: Partial<Song> = {}): Song {
  return {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    song_name: "Midnight Echo",
    artist_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    genre: "indie",
    mood: ["chill", "dreamy"],
    popularity: 42,
    emerging_artist_flag: true,
    hidden_gem_flag: true,
    community_buzz_score: 0.78,
    album_art_url: null,
    audio_preview_url: null,
    ...overrides,
  };
}

function makeCandidate(
  song: Song,
  artist: Artist,
  signals: Partial<RecommendationCandidate["matchedSignals"]> = {},
): RecommendationCandidate {
  return {
    song,
    artist,
    personalScore: 0.72,
    culturalScore: 0.81,
    finalScore: 0.76,
    matchedSignals: {
      genreMatch: "indie",
      moodMatch: "chill",
      isHiddenGem: song.hidden_gem_flag,
      isEmergingArtist: song.emerging_artist_flag,
      isTrending: false,
      communityBuzzScore: song.community_buzz_score,
      inversePopularity: 0.58,
      ...signals,
    },
  };
}

interface ExplainScenario {
  id: string;
  intent: DiscoveryIntent;
  candidate: RecommendationCandidate;
  chatReplyMustInclude?: string[];
}

function runExplainEval(): void {
  console.log("=== Explain Eval — template grounding (offline) ===\n");

  const artist = makeArtist();
  const hiddenGem = makeCandidate(makeSong(), artist);
  const trending = makeCandidate(
    makeSong({
      id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
      song_name: "Neon Drift",
      hidden_gem_flag: false,
      emerging_artist_flag: false,
      community_buzz_score: 0.82,
      popularity: 68,
    }),
    makeArtist({ id: "dddddddd-dddd-dddd-dddd-dddddddddddd", name: "Static Youth" }),
    { isTrending: true, isHiddenGem: false, isEmergingArtist: false, genreMatch: "electronic" },
  );

  const scenarios: ExplainScenario[] = [
    {
      id: "hidden-gem-template",
      intent: {
        intent: "mood_based",
        explorationLevel: "adventurous",
        mood: ["chill"],
        genre: ["indie"],
      },
      candidate: hiddenGem,
      chatReplyMustInclude: ["chill", "indie"],
    },
    {
      id: "trending-template",
      intent: {
        intent: "trending",
        explorationLevel: "adventurous",
        genre: ["electronic"],
      },
      candidate: trending,
      chatReplyMustInclude: ["electronic"],
    },
    {
      id: "similar-to-template",
      intent: {
        intent: "similar_to",
        explorationLevel: "balanced",
        seedArtist: "Coldplay",
      },
      candidate: hiddenGem,
      chatReplyMustInclude: ["Coldplay"],
    },
    {
      id: "activity-template",
      intent: {
        intent: "activity_based",
        explorationLevel: "balanced",
        activity: "late-night drive",
        mood: ["dreamy"],
      },
      candidate: hiddenGem,
      chatReplyMustInclude: ["late-night drive"],
    },
  ];

  const results = scenarios.map((scenario) => {
    const explanation = templateExplanation(scenario.candidate, scenario.intent);
    const groundingErrors = assertExplanationGrounded(explanation, scenario.candidate);
    const chatReply = templateChatReply(scenario.intent, 3);
    const chatErrors: string[] = [];

    for (const token of scenario.chatReplyMustInclude ?? []) {
      if (!chatReply.toLowerCase().includes(token.toLowerCase())) {
        chatErrors.push(`chatReply missing "${token}"`);
      }
    }

    const errors = [...groundingErrors, ...chatErrors];
    return {
      id: scenario.id,
      pass: errors.length === 0,
      detail: errors.join("; ") || undefined,
    };
  });

  const summary = buildSummary("Explain Eval (template)", results);
  printSummary(summary);
  exitFromSummaries([summary]);
}

runExplainEval();

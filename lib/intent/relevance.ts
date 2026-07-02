/**
 * Detects messages outside Raga's music-discovery scope.
 * Rule-based guard — fast, no Gemini cost, works when quota is exhausted.
 */

const MUSIC_SIGNALS =
  /\b(music|song|songs|track|tracks|artist|artists|album|albums|playlist|playlists|genre|genres|mood|moods|listen|listening|spotify|raga|discover|discovery|recommend|suggestion|beats|band|bands|singer|vocal|lyrics|chill|indie|pop|rock|jazz|hip[\s-]?hop|rap|electronic|acoustic|remix|dj|radio|vinyl|concert|soundtrack|lo[\s-]?fi|hidden gem|underrated|emerging|vibe|vibes|banger|anthem|melody|tune|tunes|curate|stream)\b/i;

const DISCOVERY_PHRASES =
  /\b(find|suggest|recommend|discover|play|show me|give me|looking for|need (some )?music|what should i listen|help me find|more like)\b/i;

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /\b(weather|forecast|temperature|humidity|rain(?:ing)?|snow|sunny|cloudy)\b/i,
  /\b(recipe|cook(?:ing)?|bake|baking|ingredient|kitchen)\b/i,
  /\b(homework|equation|calculate|calculus|algebra|geometry|math)\b/i,
  /\b(president|election|politics|government|parliament|congress)\b/i,
  /\b(stock market|crypto|bitcoin|invest(?:ing|ment)?|trading)\b/i,
  /\b(programming|javascript|typescript|python code|debug|compile|sql query)\b/i,
  /\b(doctor|symptom|medicine|diagnos|disease|treatment)\b/i,
  /\b(write (an |my )?essay|cover letter|resume cv)\b/i,
  /\b(capital of|population of|currency of)\b/i,
  /\bwhat(?:'s| is) the (time|date)\b/i,
  /\btranslate .+ (to|into)\b/i,
  /\b(who won).+\b(game|match|world cup|super bowl)\b/i,
  /\b(news today|headlines|breaking news)\b/i,
  /\b(flight|hotel|restaurant|booking|vacation plan)\b/i,
  /\b(quantum physics|machine learning tutorial|how to code)\b/i,
  /\b(distance from|directions to|map to)\b/i,
];

export const IRRELEVANT_TOPIC_REPLY =
  "I don't have information on that — I'm here just for music discovery! If you'd like, tell me a mood, genre, activity, or artist and I'll help you find something great to listen to.";

function hasMusicSignals(message: string): boolean {
  return MUSIC_SIGNALS.test(message) || DISCOVERY_PHRASES.test(message);
}

export function isIrrelevantInput(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;

  if (hasMusicSignals(trimmed)) return false;

  if (OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  // General knowledge questions without any music context
  const isGeneralQuestion =
    /^(what|who|when|where|why|how|which|is|are|do|does|can|could|will|would)\b/i.test(
      trimmed,
    ) && /\?/.test(trimmed);

  const isDefinitionRequest = /\b(what is|who is|define|explain)\b/i.test(trimmed);

  if ((isGeneralQuestion || isDefinitionRequest) && trimmed.length > 20) {
    return true;
  }

  return false;
}

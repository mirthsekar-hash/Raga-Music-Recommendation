export const TRY_THESE = [
  { label: "Night drive music", icon: "moon", href: "/chat?q=Music%20for%20a%20late-night%20drive" },
  { label: "Chill & relax", icon: "headphones", href: "/chat?q=Chill%20relaxing%20music" },
  { label: "Indie discoveries", icon: "guitar", href: "/chat?q=Suggest%20underrated%20indie%20artists" },
  { label: "Emerging artists", icon: "rocket", href: "/chat?q=Recommend%20emerging%20indie%20artists" },
  { label: "Hidden gems", icon: "gem", href: "/chat?q=Give%20me%20hidden%20gems%20similar%20to%20Coldplay" },
  { label: "Focus time beats", icon: "coffee", href: "/chat?q=Focus%20study%20beats" },
] as const;

export const RECENT_SEARCHES = [
  "Underrated indie artists",
  "Songs for rainy evening",
  "Similar to Coldplay",
] as const;

export const VIBE_CHIPS = [
  { label: "Relaxing & Calm", icon: "leaf" },
  { label: "Emotional & Melancholic", icon: "heart" },
  { label: "Instrumental", icon: "keys" },
  { label: "Indie / Acoustic", icon: "guitar" },
  { label: "Surprise me!", icon: "sparkle" },
  { label: "More options", icon: "more" },
] as const;

export const EXPLORE_CATEGORIES = [
  { label: "Lo-fi Chill beats", icon: "headphones", color: "text-purple-400" },
  { label: "Underground Hip-Hop", icon: "mic", color: "text-amber-400" },
  { label: "Alt Rock Deep cuts", icon: "guitar", color: "text-blue-400" },
  { label: "Global Grooves", icon: "globe", color: "text-pink-400" },
] as const;

export const FILTER_PILLS = ["All", "Songs", "Artists", "Playlists"] as const;

export const FEEDBACK_TAGS = [
  "Mood matched",
  "New to me",
  "Great lyrics",
  "Amazing vibe",
  "Too slow",
  "Not my style",
] as const;

export const FEEDBACK_NEXT = ["More like this", "Different vibe", "Surprise me"] as const;

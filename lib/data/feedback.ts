import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Feedback, FeedbackAction } from "@/types";

export interface FeedbackAnalytics {
  love: number;
  skip: number;
  more_like_this: number;
  total: number;
}

export async function recordFeedback(
  sessionId: string,
  songId: string,
  action: FeedbackAction,
): Promise<Feedback> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feedback")
    .insert({ session_id: sessionId, song_id: songId, action })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to record feedback");
  }

  return data as Feedback;
}

export async function getFeedbackForSession(sessionId: string): Promise<Feedback[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Feedback[];
}

export async function getLatestFeedbackBySong(
  sessionId: string,
): Promise<Record<string, FeedbackAction>> {
  const rows = await getFeedbackForSession(sessionId);
  const latest: Record<string, FeedbackAction> = {};
  for (const row of rows) {
    if (!latest[row.song_id]) {
      latest[row.song_id] = row.action;
    }
  }
  return latest;
}

export async function getSkippedSongIds(sessionId: string): Promise<string[]> {
  const latest = await getLatestFeedbackBySong(sessionId);
  return Object.entries(latest)
    .filter(([, action]) => action === "skip")
    .map(([songId]) => songId);
}

export async function getFeedbackAnalytics(sessionId: string): Promise<FeedbackAnalytics> {
  const rows = await getFeedbackForSession(sessionId);
  return {
    love: rows.filter((r) => r.action === "love").length,
    skip: rows.filter((r) => r.action === "skip").length,
    more_like_this: rows.filter((r) => r.action === "more_like_this").length,
    total: rows.length,
  };
}

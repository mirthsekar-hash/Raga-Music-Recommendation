import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { DiscoveryIntent } from "@/lib/intent/schema";

export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
  extracted_intent?: DiscoveryIntent;
  timestamp: string;
}

export interface Session {
  session_id: string;
  messages: SessionMessage[];
  created_at: string;
}

export async function createSession(): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .insert({ messages: [] })
    .select("session_id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create session");
  }

  return data.session_id;
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("session_id, messages, created_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    session_id: data.session_id,
    messages: (data.messages as SessionMessage[]) ?? [],
    created_at: data.created_at,
  };
}

export async function appendUserTurn(
  sessionId: string,
  content: string,
  extractedIntent: DiscoveryIntent,
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const turn: SessionMessage = {
    role: "user",
    content,
    extracted_intent: extractedIntent,
    timestamp: new Date().toISOString(),
  };

  const messages = [...session.messages, turn];

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("sessions")
    .update({ messages })
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);
}

export async function appendAssistantTurn(sessionId: string, content: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const turn: SessionMessage = {
    role: "assistant",
    content,
    timestamp: new Date().toISOString(),
  };

  const messages = [...session.messages, turn];

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("sessions")
    .update({ messages })
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);
}

export function historyFromSession(session: Session): Array<{ role: "user" | "assistant"; content: string }> {
  return session.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

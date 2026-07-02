import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export function createAdminClient() {
  const env = getServerEnv();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function pingSupabase(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const env = getServerEnv();
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      method: "HEAD",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, message: "Invalid Supabase credentials" };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase connection failed";
    return { ok: false, message };
  }
}

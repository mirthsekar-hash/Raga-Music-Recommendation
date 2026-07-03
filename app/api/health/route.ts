import { NextRequest, NextResponse } from "next/server";
import { pingGemini } from "@/lib/gemini/client";
import { getCircuitStatus } from "@/lib/gemini/circuit-breaker";
import { getQuotaStatus } from "@/lib/gemini/quota";
import { pingSupabase } from "@/lib/supabase/admin";
import { tryGetServerEnv } from "@/lib/env";
import type { HealthCheckResponse } from "@/types";

export async function GET(request: NextRequest) {
  const envResult = tryGetServerEnv();

  if (!envResult.success) {
    const body: HealthCheckResponse = {
      supabase: "error",
      gemini: "error",
      message: envResult.error,
    };
    return NextResponse.json(body, { status: 503 });
  }

  const { HEALTH_CHECK_SECRET } = envResult.data;
  if (HEALTH_CHECK_SECRET) {
    const secret = request.nextUrl.searchParams.get("secret");
    if (secret !== HEALTH_CHECK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const [supabaseResult, geminiResult, quota, circuit] = await Promise.all([
    pingSupabase(),
    pingGemini(),
    getQuotaStatus(),
    Promise.resolve(getCircuitStatus()),
  ]);

  const body: HealthCheckResponse = {
    supabase: supabaseResult.ok ? "ok" : "error",
    gemini: geminiResult.ok ? "ok" : "error",
    quota: {
      dailyRequests: quota.dailyRequests,
      dailyLimit: quota.dailyLimit,
      minuteRequests: quota.minuteRequests,
      minuteLimit: quota.minuteLimit,
    },
    circuit: {
      open: circuit.open,
      retryAfterMs: circuit.retryAfterMs,
    },
  };

  if (!supabaseResult.ok || !geminiResult.ok) {
    const messages = [
      !supabaseResult.ok && `supabase: ${supabaseResult.message}`,
      !geminiResult.ok && `gemini: ${geminiResult.message}`,
    ].filter(Boolean);

    body.message = messages.join("; ");
    return NextResponse.json(body, { status: 503 });
  }

  return NextResponse.json(body);
}

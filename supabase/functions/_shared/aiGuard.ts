// Server-side gate for every paid AI call (CARA chat + voice transcription).
// Requires a signed-in user with an entitled plan, enforces plan quotas and
// fair-use rate limits, and records usage AFTER a successful AI answer.
//
// Before Nov 2026 cara-chat / cara-transcribe accepted ANY caller holding the
// public anon key, with no user, plan or quota check — a free LLM proxy billed
// to the Lovable workspace AI balance.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  type AiKind,
  computeEntitlement,
  decideAiAccess,
  startOfMonthSAST,
} from "./entitlement.ts";

const ALLOWED_HOSTS = new Set([
  "app.inreco.co.za",
  "inrecoapp.inreco.co.za",
  "inreco.co.za",
  "www.inreco.co.za",
  "localhost:8080",
  "localhost:5173",
]);

/** CORS that only answers our own sites (plus Lovable preview hosts). */
export function corsFor(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  let allow = "https://app.inreco.co.za";
  try {
    const u = new URL(origin);
    if (ALLOWED_HOSTS.has(u.host) || u.hostname.endsWith(".lovable.app") || u.hostname.endsWith(".lovableproject.com")) {
      allow = u.origin;
    }
  } catch (_) {
    /* keep default */
  }
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function jsonResponse(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json" },
  });
}

/** Friendly, non-technical messages the app can show as-is. */
export const MESSAGES = {
  not_signed_in: "Please sign in to use CARA's AI adviser. The built-in topic guides stay free.",
  not_entitled:
    "Your free week has ended or your plan is not active. The built-in topic guides and templates still work — choose a plan to switch the AI adviser back on.",
  monthly_limit:
    "You've used this month's AI questions on your plan. The built-in topic guides still work, or upgrade for unlimited questions.",
  hourly_limit: "That's a lot of questions in a short time. Please wait a few minutes and try again.",
  daily_limit: "You've reached today's fair-use limit for AI questions. It resets tomorrow.",
  ai_unavailable:
    "CARA's AI adviser is temporarily unavailable. The built-in topic guides, checklists and document templates still work — try the AI again later.",
  ai_busy: "CARA's AI adviser is very busy right now. Please try again in a minute.",
} as const;

export type GuardOk = {
  ok: true;
  userId: string;
  ownerId: string;
  admin: SupabaseClient;
  remainingThisMonth: number | null;
};
export type GuardFail = { ok: false; response: Response };

export async function guardAiCall(req: Request, kind: AiKind): Promise<GuardOk | GuardFail> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { ok: false, response: jsonResponse(req, { error: "ai_unavailable", message: MESSAGES.ai_unavailable }, 503) };
  }

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  // The anon key is a JWT too, but it has no `sub`: getClaims() rejects it below.
  if (!token) {
    return { ok: false, response: jsonResponse(req, { error: "not_signed_in", message: MESSAGES.not_signed_in }, 401) };
  }
  const authed = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: claimData, error: claimError } = await authed.auth.getClaims(token);
  const userId = claimData?.claims?.sub as string | undefined;
  if (claimError || !userId) {
    return { ok: false, response: jsonResponse(req, { error: "not_signed_in", message: MESSAGES.not_signed_in }, 401) };
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Team members use their owner's plan and share its monthly allowance.
  let ownerId = userId;
  const { data: tm } = await admin
    .from("team_members")
    .select("owner_user_id")
    .eq("member_user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (tm?.owner_user_id) ownerId = tm.owner_user_id as string;

  const [{ data: isAdmin }, { data: sub }] = await Promise.all([
    admin.rpc("has_role", { _user_id: userId, _role: "admin" }),
    admin
      .from("subscriptions")
      .select("plan_name, status, trial_ends_at, paid_until, provisional_until")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const entitlement = computeEntitlement(sub, { isAdmin: !!isAdmin });

  const now = Date.now();
  const hourAgo = new Date(now - 3600 * 1000).toISOString();
  const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
  const monthStart = startOfMonthSAST(now);

  const countWhere = async (col: "user_id" | "owner_user_id", id: string, since: string) => {
    const { count } = await admin
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq(col, id)
      .eq("kind", kind)
      .gte("created_at", since);
    return count ?? 0;
  };

  const [usedThisMonthByAccount, usedLastHourByUser, usedLastDayByUser] = entitlement.entitled
    ? await Promise.all([
        countWhere("owner_user_id", ownerId, monthStart),
        countWhere("user_id", userId, hourAgo),
        countWhere("user_id", userId, dayAgo),
      ])
    : [0, 0, 0];

  const decision = decideAiAccess({
    entitlement,
    planName: (sub?.plan_name as string | null) ?? null,
    kind,
    usedThisMonthByAccount,
    usedLastHourByUser,
    usedLastDayByUser,
  });

  if (!decision.allowed) {
    const status = decision.reason === "not_entitled" ? 402 : 429;
    return {
      ok: false,
      response: jsonResponse(
        req,
        { error: decision.reason, message: MESSAGES[decision.reason], limit: decision.limit ?? null },
        status,
      ),
    };
  }

  return { ok: true, userId, ownerId, admin, remainingThisMonth: decision.remainingThisMonth };
}

/** Records one successful AI call. Never throws (usage logging must not break answers). */
export async function recordAiUsage(g: GuardOk, kind: AiKind) {
  try {
    await g.admin.from("ai_usage").insert({ user_id: g.userId, owner_user_id: g.ownerId, kind });
  } catch (e) {
    console.error("ai_usage insert failed", e);
  }
}

/** Maps an upstream AI-gateway failure to a safe client response (no upstream detail echoed). */
export async function upstreamFailure(req: Request, resp: Response, label: string) {
  const detail = await resp.text().catch(() => "");
  console.error(`${label} upstream ${resp.status}: ${detail.slice(0, 500)}`);
  if (resp.status === 429) {
    return jsonResponse(req, { error: "ai_busy", message: MESSAGES.ai_busy }, 429);
  }
  // 402 = Lovable workspace AI balance is empty; 5xx = gateway trouble.
  return jsonResponse(req, { error: "ai_unavailable", message: MESSAGES.ai_unavailable }, 503);
}

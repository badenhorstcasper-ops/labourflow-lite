// Keeps plan records honest against PayFast.
//
// Three ways in:
//  1. Once-a-day sweep (cron, or CRON_SECRET header): every monthly plan whose
//     paid-until date is more than 36 hours old gets checked against PayFast.
//  2. { action: "list" }   — owner screen: everyone whose payments look stopped.
//  3. { action: "repair", subscription_id, token? } — owner screen: recheck one
//     person, optionally saving a card reference pasted from PayFast.
//
// Rule of the house: we only park an account when PayFast itself confirms the
// arrangement is no longer running. Silence is never treated as "stopped".

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  addPeriod,
  fetchPayfastSubscription,
  findRecentPayfastPayments,
} from "../_shared/payfast.ts";

const GRACE_MS = 36 * 60 * 60 * 1000; // a day and a half

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

type Sub = {
  id: string;
  user_id: string | null;
  email: string | null;
  plan_name: string | null;
  status: string | null;
  paid_until: string | null;
  billing_interval: string | null;
  payfast_token: string | null;
  payfast_status: string | null;
  payfast_checked_at: string | null;
  payfast_note: string | null;
  is_demo: boolean | null;
};

const COLUMNS =
  "id, user_id, email, plan_name, status, paid_until, billing_interval, payfast_token, payfast_status, payfast_checked_at, payfast_note, is_demo";

type Admin = ReturnType<typeof createClient>;

/** Checks one plan record against PayFast and writes back what we learn. */
async function reconcileOne(admin: Admin, sub: Sub, tokenOverride?: string | null) {
  const now = new Date();
  const interval: "monthly" | "yearly" = sub.billing_interval === "yearly" ? "yearly" : "monthly";
  const token = (tokenOverride || sub.payfast_token || "").trim() || null;
  const patch: Record<string, unknown> = {
    payfast_checked_at: now.toISOString(),
    updated_at: now.toISOString(),
  };
  if (tokenOverride) patch.payfast_token = tokenOverride.trim();

  let outcome = "unchanged";

  if (token) {
    const truth = await fetchPayfastSubscription(token);
    patch.payfast_status = truth.state;
    patch.payfast_note = `PayFast says ${truth.state} (${truth.detail})`;

    if (truth.state === "running") {
      const runDate = truth.runDate
        ? new Date(`${truth.runDate}T00:00:00.000Z`)
        : addPeriod(now, interval);
      patch.paid_until = runDate.toISOString();
      patch.status = "active";
      outcome = "extended";
    } else if (truth.state === "stopped") {
      patch.status = "past_due";
      outcome = "parked";
    } else {
      outcome = "unknown_left_alone";
    }
  } else if (sub.email) {
    // No card reference on file — go looking in PayFast's recent daily history.
    const hits = await findRecentPayfastPayments(sub.email);
    if (hits.length > 0) {
      const latest = hits.sort((a, b) => (a.date < b.date ? 1 : -1))[0];
      const foundToken = hits.find((h) => h.token)?.token ?? null;
      if (foundToken) patch.payfast_token = foundToken;
      patch.paid_until = addPeriod(new Date(`${latest.date}T00:00:00.000Z`), interval).toISOString();
      patch.status = "active";
      patch.payfast_status = "running";
      patch.payfast_note = `Matched a PayFast payment on ${latest.date}`;
      outcome = "recovered_from_history";
    } else {
      patch.payfast_status = "unknown";
      patch.payfast_note = "No card reference on file and no recent PayFast payment found";
      outcome = "needs_reference";
    }
  } else {
    patch.payfast_status = "unknown";
    patch.payfast_note = "No card reference and no email on file";
    outcome = "needs_reference";
  }

  await admin.from("subscriptions").update(patch).eq("id", sub.id);
  return { id: sub.id, email: sub.email, plan_name: sub.plan_name, outcome, note: patch.payfast_note };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key || !anon) return json({ error: "Server not ready" }, 500);
  const admin = createClient(url, key);

  let body: { action?: string; subscription_id?: string; token?: string } = {};
  try {
    body = await req.json();
  } catch (_) {
    body = {};
  }

  // Cron runs unattended with the shared key; everything else must be an owner.
  const cronKey = req.headers.get("x-cron-secret");
  const isCron =
    !!cronKey && cronKey === Deno.env.get("CRON_SECRET") ||
    req.headers.get("Lovable-Context") === "cron";

  let isAdmin = false;
  if (!isCron) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Not signed in" }, 401);
    const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await asUser.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return json({ error: "Not signed in" }, 401);
    const { data: adminFlag } = await asUser.rpc("has_role", { _user_id: uid, _role: "admin" });
    isAdmin = !!adminFlag;
    if (!isAdmin) return json({ error: "Admins only" }, 403);
  }

  // ---- Owner screen: who looks stopped? --------------------------------
  if (body.action === "list") {
    const cutoff = new Date(Date.now() - GRACE_MS).toISOString();
    const { data } = await admin
      .from("subscriptions")
      .select(COLUMNS)
      .neq("is_demo", true)
      .order("updated_at", { ascending: false })
      .limit(500);

    const rows = ((data ?? []) as unknown as Sub[]).filter((s) => {
      if (s.status === "cancelled") return false;
      const lapsed = !s.paid_until || s.paid_until < cutoff;
      const parked = s.status === "past_due" || s.payfast_status === "stopped";
      const missingReference = !s.payfast_token && s.status === "active";
      return lapsed || parked || missingReference;
    });

    return json({ ok: true, rows });
  }

  // ---- Owner screen: repair one person ---------------------------------
  if (body.action === "repair") {
    if (!body.subscription_id) return json({ error: "missing_subscription_id" }, 400);
    const { data } = await admin
      .from("subscriptions")
      .select(COLUMNS)
      .eq("id", body.subscription_id)
      .maybeSingle();
    if (!data) return json({ error: "not_found" }, 404);
    const result = await reconcileOne(admin, data as unknown as Sub, body.token ?? null);
    return json({ ok: true, result });
  }

  // ---- Daily sweep -----------------------------------------------------
  const cutoff = new Date(Date.now() - GRACE_MS).toISOString();
  const { data } = await admin
    .from("subscriptions")
    .select(COLUMNS)
    .neq("is_demo", true)
    .in("status", ["active", "past_due", "trialing"])
    .limit(500);

  const due = ((data ?? []) as unknown as Sub[]).filter(
    (s) =>
      (s.billing_interval ?? "monthly") === "monthly" &&
      (!s.paid_until || s.paid_until < cutoff),
  );

  const results = [];
  for (const sub of due) {
    try {
      results.push(await reconcileOne(admin, sub));
    } catch (error) {
      results.push({ id: sub.id, email: sub.email, outcome: "error", note: String(error).slice(0, 200) });
    }
  }

  return json({ ok: true, checked: due.length, results });
});

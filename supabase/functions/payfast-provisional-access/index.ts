// Safety net: PayFast only redirects the buyer back to the return URL after a
// successful transaction, but the payment notification (ITN) can be slow or get
// lost. Without this, a paying customer sits locked out of the app.
//
// When a signed-in buyer lands back on /payment-success and their notification
// has not arrived yet, we grant PROVISIONAL access for 48 hours. The webhook
// clears `provisional_until` as soon as the real confirmation lands; the daily
// job removes access again if it never does.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { decideProvisional, PROVISIONAL_HOURS } from "../_shared/entitlement.ts";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_AGE_MS = 3 * 60 * 60 * 1000; // checkout must have started in the last 3 hours
// Loophole closed (Nov 2026): previously anyone could start a trial-mode
// checkout, abandon PayFast, call this function and receive 7 "trialing" days,
// repeatably and bypassing start-trial's one-trial-per-email rule. Now:
//  - trial-mode checkouts never create a new trial here if the person ever had one,
//  - every grant is capped at PROVISIONAL_HOURS (48 h), never a full trial,
//  - one unconfirmed grant per user/email per 30 days,
//  - the app's entitlement check respects provisional_until (see _shared/entitlement.ts).

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Server not ready" }, 500);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch (_) {
    return json({ error: "Invalid request" }, 400);
  }
  const mPaymentId = typeof body.mPaymentId === "string" ? body.mPaymentId.trim() : "";
  if (!UUID.test(mPaymentId)) return json({ error: "Invalid payment reference" }, 400);

  const authed = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimData, error: claimError } = await authed.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  if (claimError || !claimData?.claims?.sub) return json({ error: "Unauthorized" }, 401);

  const userId = claimData.claims.sub as string;
  const email = typeof claimData.claims.email === "string"
    ? claimData.claims.email.trim().toLowerCase()
    : "";

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: tx } = await admin
    .from("payfast_transactions")
    .select("id, user_id, email, plan_name, amount, status, billing_date, created_at, pay_mode")
    .eq("m_payment_id", mPaymentId)
    .maybeSingle();

  if (!tx) return json({ granted: false, reason: "unknown_payment" });

  const belongsToCaller =
    tx.user_id === userId ||
    (!!email && typeof tx.email === "string" && tx.email.trim().toLowerCase() === email);
  if (!belongsToCaller) return json({ granted: false, reason: "not_yours" }, 403);

  if (tx.status === "cancelled" || tx.status === "failed") {
    return json({ granted: false, reason: tx.status });
  }

  const startedAt = tx.created_at ? new Date(tx.created_at as string).getTime() : 0;
  if (!startedAt || Date.now() - startedAt > MAX_AGE_MS) {
    return json({ granted: false, reason: "expired_link" });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const confirmed = tx.status === "complete";
  const txEmail = ((tx.email as string) || email).trim().toLowerCase();

  // Has this person (by account or email) ever had a subscription row?
  const { data: priorSubs } = await admin
    .from("subscriptions")
    .select("id")
    .or(`user_id.eq.${userId}${txEmail ? `,email.ilike.${txEmail}` : ""}`)
    .limit(1);
  const hadSubscriptionBefore = (priorSubs?.length ?? 0) > 0;

  // Most recent provisional grant that never turned into a completed payment.
  const { data: lastGrant } = await admin
    .from("payfast_transactions")
    .select("provisional_granted_at")
    .or(`user_id.eq.${userId}${txEmail ? `,email.ilike.${txEmail}` : ""}`)
    .not("provisional_granted_at", "is", null)
    .neq("status", "complete")
    .order("provisional_granted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const decision = decideProvisional({
    payMode: tx.pay_mode as string | null,
    txStatus: tx.status as string | null,
    hadSubscriptionBefore,
    lastUnconfirmedGrantAt: (lastGrant?.provisional_granted_at as string | null) ?? null,
    now: now.getTime(),
  });
  if (!decision.grant) {
    // Not an error for the buyer: PayFast's confirmation will still activate
    // the plan the moment it arrives.
    return json({ granted: false, reason: decision.reason, waitingForPayfast: true });
  }

  const provisionalUntil = new Date(now.getTime() + PROVISIONAL_HOURS * 3600 * 1000).toISOString();
  const payNow = (tx.pay_mode as string | null) === "now";

  // Confirmed by PayFast: same behaviour as before (a card-on-file trial keeps
  // its billing-date trial; a paid checkout is active).
  const billingDate = typeof tx.billing_date === "string" ? tx.billing_date : null;
  const billingAt = billingDate ? new Date(`${billingDate}T00:00:00.000Z`) : null;
  const confirmedTrial = confirmed && !!billingAt && billingAt.getTime() > now.getTime();

  let status: string;
  let trialEndsAt: string | null;
  if (confirmed) {
    status = confirmedTrial ? "trialing" : "active";
    trialEndsAt = confirmedTrial ? billingAt!.toISOString() : null;
  } else if (payNow) {
    status = "active";
    trialEndsAt = null;
  } else {
    // Unconfirmed trial-mode checkout: a short window only, never a full week.
    status = "trialing";
    trialEndsAt = provisionalUntil;
  }

  const row: Record<string, unknown> = {
    user_id: userId,
    email: (tx.email as string) || email,
    plan_name: tx.plan_name,
    status,
    trial_ends_at: trialEndsAt,
    is_demo: false,
    updated_at: nowIso,
    provisional_until: confirmed ? null : provisionalUntil,
  };

  // Attach the payment to this account if it was started while signed out.
  if (!tx.user_id) {
    await admin
      .from("payfast_transactions")
      .update({ user_id: userId, updated_at: nowIso })
      .eq("id", tx.id);
  }

  const { data: mine } = await admin
    .from("subscriptions")
    .select("id, status, provisional_until, trial_ends_at, paid_until")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let subId = mine?.id as string | undefined;

  // Already inside a longer running trial or paid month? Don't shorten it with
  // a 48-hour provisional window — PayFast's confirmation will upgrade it.
  if (!confirmed && mine) {
    const keepUntil = Math.max(
      mine.status === "trialing" && mine.trial_ends_at ? new Date(mine.trial_ends_at as string).getTime() : 0,
      mine.paid_until ? new Date(mine.paid_until as string).getTime() : 0,
    );
    if (keepUntil > new Date(provisionalUntil).getTime()) {
      return json({ granted: true, confirmed: false, plan: tx.plan_name, provisional: false, kept: true });
    }
  }

  if (!subId && email) {
    const { data: byEmail } = await admin
      .from("subscriptions")
      .select("id")
      .is("user_id", null)
      .ilike("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    subId = byEmail?.id as string | undefined;
  }

  if (!confirmed) {
    await admin
      .from("payfast_transactions")
      .update({ provisional_granted_at: nowIso, updated_at: nowIso })
      .eq("id", tx.id);
  }

  if (subId) {
    await admin.from("subscriptions").update(row).eq("id", subId);
  } else {
    await admin.from("subscriptions").insert(row);
  }

  return json({
    granted: true,
    confirmed,
    plan: tx.plan_name,
    provisional: !confirmed,
  });
});

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

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_AGE_MS = 3 * 60 * 60 * 1000; // checkout must have started in the last 3 hours
const PROVISIONAL_HOURS = 48;

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
    .select("id, user_id, email, plan_name, amount, status, billing_date, created_at")
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

  // Free trial => billing date is in the future. Pay-now => billing date is today.
  const billingDate = typeof tx.billing_date === "string" ? tx.billing_date : null;
  const trialEndsAt = billingDate ? new Date(`${billingDate}T00:00:00.000Z`) : null;
  const isTrial = !!trialEndsAt && trialEndsAt.getTime() > now.getTime();

  const row: Record<string, unknown> = {
    user_id: userId,
    email: (tx.email as string) || email,
    plan_name: tx.plan_name,
    status: isTrial ? "trialing" : "active",
    trial_ends_at: isTrial ? trialEndsAt!.toISOString() : null,
    is_demo: false,
    updated_at: nowIso,
    provisional_until: confirmed
      ? null
      : new Date(now.getTime() + PROVISIONAL_HOURS * 3600 * 1000).toISOString(),
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
    .select("id, status, provisional_until")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let subId = mine?.id as string | undefined;

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

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  PLAN_NAMES,
  PLAN_PRICES,
  type PlanName,
  buildCheckoutFields,
  checkoutItemName,
  payfastCredentials,
  safeOrigin,
  signFields,
} from "../_shared/payfast.ts";

/** A scan-to-pay code stays valid for this long, then it must be refreshed. */
const SESSION_MINUTES = 30;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "Payment link is not ready." }, 500);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_) {
    return json({ error: "This payment link is not valid." }, 400);
  }

  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  if (!/^[0-9a-fA-F-]{36}$/.test(reference)) {
    return json({ error: "This payment link is not valid." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: tx } = await admin
    .from("payfast_transactions")
    .select("m_payment_id, email, plan_name, amount, billing_date, referral_code, status, created_at, pay_mode")
    .eq("m_payment_id", reference)
    .maybeSingle();

  if (!tx) return json({ error: "This payment link is not valid." }, 404);
  if (tx.status !== "pending") {
    return json({ error: "This payment has already been dealt with. Please start again." }, 409);
  }

  const ageMinutes = (Date.now() - new Date(tx.created_at as string).getTime()) / 60000;
  if (ageMinutes > SESSION_MINUTES) {
    return json({ error: "This payment code has expired. Please generate a new one." }, 410);
  }

  const planName = String(tx.plan_name || "");
  if (!PLAN_NAMES.has(planName as PlanName)) {
    return json({ error: "This payment link is not valid." }, 400);
  }

  const { mode, merchantId, merchantKey, passphrase, actionUrl } = payfastCredentials();
  if (mode === "live" && merchantKey.length !== 13) {
    return json({ error: "Payments are being finalised. Please try again shortly." }, 500);
  }

  const payNow = tx.pay_mode === "now";
  const fullAmount = PLAN_PRICES[planName as PlanName];
  const trialDays = Math.max(
    1,
    Math.round(
      (new Date(`${tx.billing_date}T00:00:00Z`).getTime() - new Date(tx.created_at as string).getTime()) / 86400000,
    ),
  );

  const baseFields = buildCheckoutFields({
    merchantId,
    merchantKey,
    origin: safeOrigin(req),
    notifyUrl: `${supabaseUrl}/functions/v1/payfast-webhook`,
    email: String(tx.email || ""),
    mPaymentId: String(tx.m_payment_id),
    planName,
    amountToday: payNow ? Number(tx.amount) || 0 : 0,
    recurringAmount: fullAmount,
    billingDate: String(tx.billing_date),
    itemName: checkoutItemName(planName, payNow, trialDays),
    referralCode: (tx.referral_code as string | null) ?? null,
    paymentMethod: null,
  });

  const fields = await signFields(baseFields, passphrase);

  return json({
    actionUrl,
    fields,
    planName,
    amountToday: payNow ? Number(tx.amount) || 0 : 0,
    recurringAmount: fullAmount,
    payNow,
    billingDate: tx.billing_date,
  });
});

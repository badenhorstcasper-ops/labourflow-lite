import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

type PlanName = "Solo" | "Business" | "Professional";

const PLAN_PRICES: Record<PlanName, number> = {
  Solo: 259,
  Business: 599,
  Professional: 1499,
};

const PLAN_NAMES = new Set<PlanName>(["Solo", "Business", "Professional"]);
const TRIAL_DAYS = 7;
/** Someone who arrives through a friend's invite link gets double the trial. */
const REFERRED_TRIAL_DAYS = 14;
/** PayFast will not process a card payment below this amount. */
const MIN_CHARGE_ZAR = 5;
const LIVE_MERCHANT_ID = "12090292";
const LIVE_MERCHANT_KEY = "3xbkln8wrhwqj";
const SANDBOX_MERCHANT_ID = "10000100";
const SANDBOX_MERCHANT_KEY = "46f0cd694581a";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function pfEncode(value: string) {
  // Must match PHP's urlencode(), which PayFast uses to build the signature:
  // spaces become "+", and !'()*~ are escaped too (encodeURIComponent leaves
  // them alone, which silently broke the signature for item names containing
  // brackets, e.g. "... (7-day free trial)").
  return encodeURIComponent(value.trim())
    .replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%[0-9a-f]{2}/g, (match) => match.toUpperCase())
    .replace(/%20/g, "+");
}

async function md5Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("MD5", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function payfastSignature(fields: Record<string, string>, passphrase: string) {
  const base = Object.entries(fields)
    .filter(([key, value]) => key !== "signature" && value !== "")
    .map(([key, value]) => `${key}=${pfEncode(value)}`)
    .join("&");

  const withPassphrase = passphrase.trim()
    ? `${base}&passphrase=${pfEncode(passphrase)}`
    : base;

  return md5Hex(withPassphrase);
}

async function signFields(fields: Record<string, string>, passphrase: string) {
  return {
    ...fields,
    signature: await payfastSignature(fields, passphrase),
  };
}

function safeOrigin(req: Request) {
  const origin = req.headers.get("origin") || "";
  try {
    const parsed = new URL(origin);
    const allowedHosts = new Set([
      "app.inreco.co.za",
      "inrecoapp.inreco.co.za",
      "basic-task-sparkle.lovable.app",
      "localhost:8080",
    ]);
    if (allowedHosts.has(parsed.host) || parsed.hostname.endsWith(".lovable.app")) {
      return parsed.origin;
    }
  } catch (_) {
    // Fall back below.
  }
  return "https://app.inreco.co.za";
}

function trialBillingDate(days: number = TRIAL_DAYS) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function userFromRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!authHeader?.startsWith("Bearer ") || !supabaseUrl || !anonKey) {
    return { id: null as string | null, email: null as string | null };
  }
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) return { id: null, email: null };
  const claimEmail = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: data.claims.sub, email: claimEmail };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Checkout is not ready. Please try again shortly." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_) {
    return json({ error: "Please enter a valid email address and choose a plan." }, 400);
  }

  const planName = typeof body.planName === "string" ? body.planName : "";
  if (!PLAN_NAMES.has(planName as PlanName)) {
    return json({ error: "Please choose Solo, Business or Professional." }, 400);
  }

  const authedUser = await userFromRequest(req);
  const requestedEmail = cleanEmail(body.email);
  const email = cleanEmail(authedUser.email || requestedEmail);
  if (!isValidEmail(email)) {
    return json({ error: "Please enter a valid email address before starting the trial." }, 400);
  }

  // Referral code (optional). Validate against an active salesperson.
  let referralCode: string | null = null;
  const rawRef = typeof body.referralCode === "string" ? body.referralCode.trim().toUpperCase() : "";
  if (rawRef && /^INR-[A-Z0-9]{4,12}$/.test(rawRef)) {
    const probe = createClient(supabaseUrl, serviceKey);
    const { data: sp } = await probe
      .from("salespersons")
      .select("id")
      .eq("referral_code", rawRef)
      .eq("status", "active")
      .maybeSingle();
    if (sp?.id) referralCode = rawRef;
  }


  const mode = Deno.env.get("PAYFAST_MODE")?.toLowerCase() === "live" ? "live" : "sandbox";
  const merchantId = mode === "live"
    ? (Deno.env.get("PAYFAST_MERCHANT_ID") || LIVE_MERCHANT_ID).trim()
    : SANDBOX_MERCHANT_ID;
  const envKey = (Deno.env.get("PAYFAST_MERCHANT_KEY") || "").trim();
  const merchantKey = mode === "live"
    ? (envKey.length === 13 ? envKey : LIVE_MERCHANT_KEY)
    : SANDBOX_MERCHANT_KEY;
  const passphrase = (Deno.env.get("PAYFAST_PASSPHRASE_V2") || Deno.env.get("PAYFAST_PASSPHRASE") || "").trim();

  if (mode === "live" && merchantKey.length !== 13) {
    return json(
      {
        error: "PayFast needs the full 13-character merchant key before live trials can start.",
        details: `The saved key is ${merchantKey.length} characters long.`,
      },
      500,
    );
  }

  const origin = safeOrigin(req);
  const fullAmount = PLAN_PRICES[planName as PlanName];
  // "now" = pay today and start billing immediately. "trial" = free days first.
  const payNow = typeof body.mode === "string" && body.mode.toLowerCase() === "now";
  const admin = createClient(supabaseUrl, serviceKey);

  // Someone who joined through a friend's invite link gets 14 free days.
  let trialDays = TRIAL_DAYS;
  if (authedUser.id) {
    const { data: invited } = await admin
      .from("referral_signups")
      .select("id")
      .eq("referred_user_id", authedUser.id)
      .neq("status", "blocked")
      .maybeSingle();
    if (invited?.id) trialDays = REFERRED_TRIAL_DAYS;
  }

  // Referral credit the buyer has earned comes off this payment automatically.
  let creditApplied = 0;
  let creditIds: string[] = [];
  if (authedUser.id && payNow) {
    const { data: credits } = await admin
      .from("referral_credits")
      .select("id, amount_zar")
      .eq("user_id", authedUser.id)
      .eq("status", "granted")
      .order("created_at", { ascending: true });
    const maxUsable = Math.max(0, fullAmount - MIN_CHARGE_ZAR);
    for (const c of credits ?? []) {
      if (creditApplied >= maxUsable) break;
      const value = Number(c.amount_zar) || 0;
      if (creditApplied + value > maxUsable) continue;
      creditApplied += value;
      creditIds.push(c.id as string);
    }
  }

  const amount = Math.max(0, fullAmount - creditApplied);
  const billingDate = payNow ? new Date().toISOString().slice(0, 10) : trialBillingDate(trialDays);
  const mPaymentId = globalThis.crypto.randomUUID();
  const notifyUrl = `${supabaseUrl}/functions/v1/payfast-webhook`;
  const { error: txError } = await admin.from("payfast_transactions").insert({
    user_id: authedUser.id,
    email,
    m_payment_id: mPaymentId,
    plan_name: planName,
    amount,
    status: "pending",
    billing_date: billingDate,
    referral_code: referralCode,
    referral_credit_zar: creditApplied,
  });

  if (txError) {
    console.error("Could not create PayFast tracking record", txError);
    return json({ error: "Checkout could not start. Please try again." }, 500);
  }

  // Hold the credit against this checkout so it cannot be spent twice.
  if (creditIds.length) {
    await admin
      .from("referral_credits")
      .update({ status: "reserved", note: `Reserved for checkout ${mPaymentId}` })
      .in("id", creditIds);
  }

  const baseFields: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${origin}/payment-success?m=${encodeURIComponent(mPaymentId)}`,
    cancel_url: `${origin}/payment-cancelled?m=${encodeURIComponent(mPaymentId)}`,
    notify_url: notifyUrl,
    email_address: email,
    m_payment_id: mPaymentId,
    amount: payNow ? amount.toFixed(2) : "0.00",
    item_name: payNow
      ? `iNRECO Pocket Consultant - ${planName}`
      : `iNRECO Pocket Consultant - ${planName} (${trialDays}-day free trial)`,
    item_description: "iNRECO Pocket Consultant subscription access",

    subscription_type: "1",
    billing_date: billingDate,
    recurring_amount: fullAmount.toFixed(2),
    frequency: "3",
    cycles: "0",
  };
  if (referralCode) baseFields.custom_str1 = referralCode;



  const fields = await signFields(baseFields, passphrase);


  return json({
    actionUrl: mode === "live" ? "https://www.payfast.co.za/eng/process" : "https://sandbox.payfast.co.za/eng/process",
    fields,
    billingDate,
    mPaymentId,
  });
});
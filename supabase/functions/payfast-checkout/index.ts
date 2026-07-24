import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

type PlanName = "Solo" | "Business" | "Professional";

const PLAN_PRICES: Record<PlanName, number> = {
  Solo: 259,
  Business: 499,
  Professional: 1499,
};

const PLAN_NAMES = new Set<PlanName>(["Solo", "Business", "Professional"]);
const TRIAL_DAYS = 7;
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
  return encodeURIComponent(value.trim())
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

function trialBillingDate() {
  const date = new Date();
  date.setDate(date.getDate() + TRIAL_DAYS);
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

  const mode = Deno.env.get("PAYFAST_MODE")?.toLowerCase() === "live" ? "live" : "sandbox";
  const merchantId = mode === "live"
    ? (Deno.env.get("PAYFAST_MERCHANT_ID") || LIVE_MERCHANT_ID).trim()
    : SANDBOX_MERCHANT_ID;
  const envKey = (Deno.env.get("PAYFAST_MERCHANT_KEY") || "").trim();
  const merchantKey = mode === "live"
    ? (envKey.length === 13 ? envKey : LIVE_MERCHANT_KEY)
    : SANDBOX_MERCHANT_KEY;
  const passphrase = (Deno.env.get("PAYFAST_PASSPHRASE") || "").trim();

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
  const amount = PLAN_PRICES[planName as PlanName];
  const billingDate = trialBillingDate();
  const mPaymentId = globalThis.crypto.randomUUID();
  const notifyUrl = `${supabaseUrl}/functions/v1/payfast-webhook`;
  const admin = createClient(supabaseUrl, serviceKey);
  const { error: txError } = await admin.from("payfast_transactions").insert({
    user_id: authedUser.id,
    email,
    m_payment_id: mPaymentId,
    plan_name: planName,
    amount,
    status: "pending",
    billing_date: billingDate,
  });

  if (txError) {
    console.error("Could not create PayFast tracking record", txError);
    return json({ error: "Checkout could not start. Please try again." }, 500);
  }

  const fields = await signFields(
    {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${origin}/payment-success?m=${encodeURIComponent(mPaymentId)}`,
      cancel_url: `${origin}/payment-cancelled?m=${encodeURIComponent(mPaymentId)}`,
      notify_url: notifyUrl,
      email_address: email,
      m_payment_id: mPaymentId,
      amount: "0.00",
      item_name: `iNRECO ${planName} Plan - 7-day free trial`,
      item_description: "iNRECO subscription access",
      subscription_type: "1",
      billing_date: billingDate,
      recurring_amount: amount.toFixed(2),
      frequency: "3",
      cycles: "0",
    },
    passphrase,
  );

  return json({
    actionUrl: mode === "live" ? "https://www.payfast.co.za/eng/process" : "https://sandbox.payfast.co.za/eng/process",
    fields,
    billingDate,
    mPaymentId,
  });
});
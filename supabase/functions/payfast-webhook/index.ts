import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const MERCHANT_ID = "12090292";
const SANDBOX_MERCHANT_ID = "10000100";
const PAYFAST_MODE: "sandbox" | "live" =
  Deno.env.get("PAYFAST_MODE")?.toLowerCase() === "live" ? "live" : "sandbox";
const PAYFAST_PASSPHRASE = (Deno.env.get("PAYFAST_PASSPHRASE") || "").trim();
const PAYFAST_HOST = PAYFAST_MODE === "live" ? "www.payfast.co.za" : "sandbox.payfast.co.za";
const VALIDATE_URL = `https://${PAYFAST_HOST}/eng/query/validate`;
const PAYFAST_HOSTS = [
  "www.payfast.co.za",
  "sandbox.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
];

type PayfastTransaction = {
  id: string;
  user_id: string | null;
  email: string;
  plan_name: string;
  amount: number | string;
  billing_date: string | null;
};

let ipCache: { ips: Set<string>; at: number } = { ips: new Set(), at: 0 };

function ok() {
  return new Response("OK", { status: 200, headers: corsHeaders });
}

function clientIp(req: Request) {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

async function getAllowedIps() {
  if (PAYFAST_MODE !== "live") return null;
  if (Date.now() - ipCache.at < 6 * 60 * 60 * 1000 && ipCache.ips.size > 0) {
    return ipCache.ips;
  }

  const ips = new Set<string>();
  await Promise.all(
    PAYFAST_HOSTS.map(async (host) => {
      try {
        const records = await Deno.resolveDns(host, "A");
        records.forEach((ip) => ips.add(ip));
      } catch (_) {}
      try {
        const records = await Deno.resolveDns(host, "AAAA");
        records.forEach((ip) => ips.add(ip));
      } catch (_) {}
    }),
  );
  ipCache = { ips, at: Date.now() };
  return ips;
}

async function md5Hex(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("MD5", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function pfEncode(value: string) {
  return encodeURIComponent(value.trim())
    .replace(/%[0-9a-f]{2}/g, (match) => match.toUpperCase())
    .replace(/%20/g, "+");
}

async function expectedSignatureFromRaw(raw: string, passphrase: string) {
  const pairs: [string, string][] = [];
  for (const part of raw.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const key = decodeURIComponent(eq === -1 ? part : part.slice(0, eq));
    const value = decodeURIComponent(eq === -1 ? "" : part.slice(eq + 1).replace(/\+/g, " "));
    if (key === "signature" || value === "") continue;
    pairs.push([key, value]);
  }

  const base = pairs.map(([key, value]) => `${key}=${pfEncode(value)}`).join("&");
  const signed = passphrase ? `${base}&passphrase=${pfEncode(passphrase)}` : base;
  return md5Hex(signed);
}

async function validateWithPayfast(raw: string) {
  const response = await fetch(VALIDATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: raw,
  });
  if (!response.ok) return false;
  const text = (await response.text()).trim();
  return text === "VALID";
}

async function logAttempt(
  supabase: ReturnType<typeof createClient>,
  fields: Record<string, unknown>,
) {
  try {
    await supabase.from("payfast_webhook_log").insert(fields);
  } catch (error) {
    console.error("Could not save PayFast callback log", error);
  }
}

async function findSubscriptionId(
  supabase: ReturnType<typeof createClient>,
  tx: PayfastTransaction,
  payfastToken: string | null,
) {
  if (payfastToken) {
    const { data } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("payfast_token", payfastToken)
      .limit(1)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  if (tx.user_id) {
    const { data } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", tx.user_id)
      .limit(1)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .ilike("email", tx.email)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ? (data.id as string) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return ok();

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return ok();

  const supabase = createClient(supabaseUrl, serviceKey);
  const raw = await req.text();
  const params = new URLSearchParams(raw);
  const data: Record<string, string> = {};
  params.forEach((value, key) => (data[key] = value));

  const sourceIp = clientIp(req);
  const mPaymentId = data.m_payment_id || null;
  const pfPaymentId = data.pf_payment_id || null;
  const merchantId = data.merchant_id || null;
  const paymentStatus = data.payment_status || null;
  const amountGross = data.amount_gross ? Number(data.amount_gross) : null;
  const payfastToken = data.token || null;
  const baseLog = {
    m_payment_id: mPaymentId,
    pf_payment_id: pfPaymentId,
    merchant_id: merchantId,
    payment_status: paymentStatus,
    amount_gross: amountGross,
    plan_name: null,
    source_ip: sourceIp,
    payload: data,
  };

  try {
    const validMerchants = new Set([MERCHANT_ID]);
    if (PAYFAST_MODE === "sandbox") validMerchants.add(SANDBOX_MERCHANT_ID);
    if (!merchantId || !validMerchants.has(merchantId)) {
      await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: "bad_merchant_id" });
      return ok();
    }

    const allowedIps = await getAllowedIps();
    if (sourceIp && allowedIps && allowedIps.size > 0 && !allowedIps.has(sourceIp)) {
      await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: `bad_ip:${sourceIp}` });
      return ok();
    }

    if (PAYFAST_PASSPHRASE) {
      const expectedSignature = await expectedSignatureFromRaw(raw, PAYFAST_PASSPHRASE);
      const receivedSignature = data.signature || "";
      if (receivedSignature.toLowerCase() !== expectedSignature.toLowerCase()) {
        await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: "bad_signature" });
        return ok();
      }
    }

    const payfastValidated = await validateWithPayfast(raw);
    if (!payfastValidated) {
      await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: "validate_failed" });
      return ok();
    }

    if (!mPaymentId) {
      await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: "missing_payment_id" });
      return ok();
    }

    const { data: txData } = await supabase
      .from("payfast_transactions")
      .select("id, user_id, email, plan_name, amount, billing_date")
      .eq("m_payment_id", mPaymentId)
      .maybeSingle();
    const tx = txData as PayfastTransaction | null;

    if (!tx) {
      await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: "unknown_transaction" });
      return ok();
    }

    const txLog = { ...baseLog, plan_name: tx.plan_name, matched_user_id: tx.user_id, matched_email: tx.email };

    if (paymentStatus === "CANCELLED") {
      await supabase
        .from("payfast_transactions")
        .update({ status: "cancelled", pf_payment_id: pfPaymentId, payfast_token: payfastToken, raw_itn: data })
        .eq("id", tx.id);

      const subscriptionId = await findSubscriptionId(supabase, tx, payfastToken);
      if (subscriptionId) {
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", subscriptionId);
      }

      await logAttempt(supabase, { ...txLog, outcome: "accepted", reason: "cancelled" });
      return ok();
    }

    if (paymentStatus === "FAILED") {
      await supabase
        .from("payfast_transactions")
        .update({ status: "failed", pf_payment_id: pfPaymentId, payfast_token: payfastToken, raw_itn: data })
        .eq("id", tx.id);

      const subscriptionId = await findSubscriptionId(supabase, tx, payfastToken);
      if (subscriptionId) {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("id", subscriptionId);
      }

      await logAttempt(supabase, { ...txLog, outcome: "accepted", reason: "failed_debit" });
      return ok();
    }

    if (paymentStatus !== "COMPLETE") {
      await supabase
        .from("payfast_transactions")
        .update({ status: (paymentStatus || "unknown").toLowerCase(), raw_itn: data })
        .eq("id", tx.id);
      await logAttempt(supabase, { ...txLog, outcome: "ignored", reason: `status:${paymentStatus}` });
      return ok();
    }

    const expectedAmount = Number(tx.amount);
    const paidToday = amountGross !== null && Math.abs(amountGross) < 0.01;
    if (!paidToday && (amountGross === null || Math.abs(amountGross - expectedAmount) > 0.01)) {
      await logAttempt(supabase, {
        ...txLog,
        outcome: "rejected",
        reason: `amount_mismatch:expected=${expectedAmount} got=${amountGross}`,
      });
      return ok();
    }

    const now = new Date().toISOString();
    const trialEndsAt = tx.billing_date ? new Date(`${tx.billing_date}T00:00:00.000Z`).toISOString() : null;
    await supabase
      .from("payfast_transactions")
      .update({
        status: "complete",
        pf_payment_id: pfPaymentId,
        payfast_token: payfastToken,
        raw_itn: data,
      })
      .eq("id", tx.id);

    const subscriptionId = await findSubscriptionId(supabase, tx, payfastToken);
    const subscriptionRow = {
      user_id: tx.user_id,
      email: tx.email,
      plan_name: tx.plan_name,
      status: paidToday ? "trialing" : "active",
      trial_ends_at: paidToday ? trialEndsAt : null,
      payfast_token: payfastToken,
      pf_payment_id: pfPaymentId,
      updated_at: now,
    };

    if (subscriptionId) {
      await supabase.from("subscriptions").update(subscriptionRow).eq("id", subscriptionId);
    } else {
      await supabase.from("subscriptions").insert(subscriptionRow);
    }

    await logAttempt(supabase, { ...txLog, outcome: "accepted" });
    return ok();
  } catch (error) {
    console.error("PayFast callback failed", error);
    await logAttempt(supabase, { ...baseLog, outcome: "error", reason: String(error).slice(0, 200) });
    return ok();
  }
});
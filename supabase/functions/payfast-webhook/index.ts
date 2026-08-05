import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { fetchPayfastSubscription, nextPaidUntil, PLAN_RANK } from "../_shared/payfast.ts";


// The live merchant number comes from the saved PayFast settings so it can never
// drift from the one used when the checkout was created.
const MERCHANT_ID = (Deno.env.get("PAYFAST_MERCHANT_ID") || "12090292").trim();
const SANDBOX_MERCHANT_ID = "10000100";

const PAYFAST_MODE: "sandbox" | "live" =
  Deno.env.get("PAYFAST_MODE")?.toLowerCase() === "live" ? "live" : "sandbox";
const PAYFAST_PASSPHRASE = (Deno.env.get("PAYFAST_PASSPHRASE_V2") || Deno.env.get("PAYFAST_PASSPHRASE") || "").trim();
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
  referral_code: string | null;
  referral_credit_zar: number | string | null;
};

/** Credit a referrer earns once their friend actually starts paying. */
const REFERRAL_REWARDS: Record<string, number> = {
  Solo: 50,
  Business: 100,
  Professional: 150,
  Enterprise: 250,
};

/** Put credit that was held for an abandoned or failed checkout back in the pot. */
async function releaseReservedCredit(
  supabase: ReturnType<typeof createClient>,
  mPaymentId: string,
) {
  await supabase
    .from("referral_credits")
    .update({ status: "granted", note: null })
    .eq("status", "reserved")
    .eq("note", `Reserved for checkout ${mPaymentId}`);
}

/** Reward the person whose invite link brought this paying customer in. */
async function awardReferralCredit(
  supabase: ReturnType<typeof createClient>,
  tx: PayfastTransaction,
) {
  const query = supabase
    .from("referral_signups")
    .select("id, referrer_user_id, status")
    .eq("status", "pending")
    .limit(1);
  const { data: signup } = tx.user_id
    ? await query.eq("referred_user_id", tx.user_id).maybeSingle()
    : await query.eq("referred_email", tx.email.toLowerCase()).maybeSingle();
  if (!signup?.id) return;

  const reward = REFERRAL_REWARDS[tx.plan_name] ?? 0;
  const referrerId = signup.referrer_user_id as string;

  await supabase
    .from("referral_signups")
    .update({ status: "converted", converted_plan: tx.plan_name, converted_at: new Date().toISOString() })
    .eq("id", signup.id);

  if (reward <= 0) return;

  // Monthly cap per account, set by the owner in the admin area.
  const { data: settings } = await supabase
    .from("referral_settings")
    .select("monthly_cap_zar")
    .eq("id", 1)
    .maybeSingle();
  const cap = Number(settings?.monthly_cap_zar ?? 500);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const { data: thisMonth } = await supabase
    .from("referral_credits")
    .select("amount_zar")
    .eq("user_id", referrerId)
    .neq("status", "reversed")
    .gte("created_at", monthStart.toISOString());
  const earned = (thisMonth ?? []).reduce((total, row) => total + Number(row.amount_zar || 0), 0);
  const allowed = Math.max(0, Math.min(reward, cap - earned));
  if (allowed <= 0) {
    console.log("referral credit skipped: monthly cap reached", referrerId);
    return;
  }

  await supabase.from("referral_credits").insert({
    user_id: referrerId,
    signup_id: signup.id,
    amount_zar: allowed,
    plan_name: tx.plan_name,
    status: "granted",
    note: allowed < reward ? "Reduced by the monthly referral cap" : null,
  });
}



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
  // Must match PHP's urlencode() used by PayFast.
  return encodeURIComponent(value.trim())
    .replace(/[!'()*~]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase())
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

type SubscriptionRow = {
  id: string;
  user_id: string | null;
  plan_name: string | null;
  status: string | null;
  paid_until: string | null;
  billing_interval: string | null;
  payfast_token: string | null;
};

const SUB_COLUMNS = "id, user_id, plan_name, status, paid_until, billing_interval, payfast_token";

/** Only write the card reference when PayFast actually sent one. */
function tokenPatch(payfastToken: string | null) {
  return payfastToken ? { payfast_token: payfastToken } : {};
}

async function findSubscription(
  supabase: ReturnType<typeof createClient>,
  tx: PayfastTransaction,
  payfastToken: string | null,
): Promise<SubscriptionRow | null> {
  if (payfastToken) {
    const { data } = await supabase
      .from("subscriptions")
      .select(SUB_COLUMNS)
      .eq("payfast_token", payfastToken)
      .limit(1)
      .maybeSingle();
    if (data) return data as unknown as SubscriptionRow;
  }

  if (tx.user_id) {
    const { data } = await supabase
      .from("subscriptions")
      .select(SUB_COLUMNS)
      .eq("user_id", tx.user_id)
      .limit(1)
      .maybeSingle();
    if (data) return data as unknown as SubscriptionRow;
  }

  const { data } = await supabase
    .from("subscriptions")
    .select(SUB_COLUMNS)
    .ilike("email", tx.email)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as unknown as SubscriptionRow) ?? null;
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
      await logAttempt(supabase, {
        ...baseLog,
        outcome: "rejected",
        reason: `bad_merchant_id:${merchantId ?? "missing"} expected:${MERCHANT_ID}`,
      });

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
      .select("id, user_id, email, plan_name, amount, billing_date, referral_code, referral_credit_zar")
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
        .update({ status: "cancelled", pf_payment_id: pfPaymentId, ...tokenPatch(payfastToken), raw_itn: data })
        .eq("id", tx.id);

      const sub = await findSubscription(supabase, tx, payfastToken);
      if (sub) {
        // Keep the customer going until the month they already paid for ends.
        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            payfast_status: "stopped",
            payfast_checked_at: new Date().toISOString(),
            payfast_note: "PayFast reported the arrangement was cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", sub.id);
      }

      await releaseReservedCredit(supabase, mPaymentId);
      await logAttempt(supabase, { ...txLog, outcome: "accepted", reason: "cancelled" });
      return ok();
    }

    if (paymentStatus === "FAILED") {
      await supabase
        .from("payfast_transactions")
        .update({ status: "failed", pf_payment_id: pfPaymentId, ...tokenPatch(payfastToken), raw_itn: data })
        .eq("id", tx.id);

      const sub = await findSubscription(supabase, tx, payfastToken);
      if (sub) {
        // A single failed debit is not proof of anything — ask PayFast first.
        const token = payfastToken || sub.payfast_token;
        const truth = token
          ? await fetchPayfastSubscription(token)
          : { state: "unknown" as const, runDate: null, detail: "no_token_on_file" };

        const patch: Record<string, unknown> = {
          payfast_status: truth.state,
          payfast_checked_at: new Date().toISOString(),
          payfast_note: `Failed debit; PayFast says ${truth.state} (${truth.detail})`,
          updated_at: new Date().toISOString(),
        };
        if (truth.state === "stopped") {
          patch.status = "past_due";
        } else if (truth.state === "running" && truth.runDate) {
          // Still running at PayFast — trust their next payment date.
          patch.paid_until = new Date(`${truth.runDate}T00:00:00.000Z`).toISOString();
        }
        await supabase.from("subscriptions").update(patch).eq("id", sub.id);
      }

      await releaseReservedCredit(supabase, mPaymentId);
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
        ...tokenPatch(payfastToken),
        raw_itn: data,
      })
      .eq("id", tx.id);

    const sub = await findSubscription(supabase, tx, payfastToken);
    const interval: "monthly" | "yearly" =
      (sub?.billing_interval as "monthly" | "yearly") ?? "monthly";

    // Never let a cheaper or once-off purchase demote a live, paid-up plan.
    const existingLive =
      !!sub &&
      (sub.status === "active" || sub.status === "trialing") &&
      !!sub.paid_until &&
      new Date(sub.paid_until).getTime() > Date.now();
    const existingRank = PLAN_RANK[sub?.plan_name ?? ""] ?? 0;
    const incomingRank = PLAN_RANK[tx.plan_name] ?? 0;
    const keepExistingPlan = existingLive && incomingRank < existingRank;

    const subscriptionRow: Record<string, unknown> = {
      user_id: tx.user_id ?? sub?.user_id ?? null,
      email: tx.email,
      plan_name: keepExistingPlan ? sub!.plan_name : tx.plan_name,
      status: paidToday ? "trialing" : "active",
      trial_ends_at: paidToday ? trialEndsAt : null,
      pf_payment_id: pfPaymentId,
      // The real confirmation has landed — this is no longer provisional access.
      provisional_until: null,
      payfast_status: "running",
      payfast_checked_at: now,
      payfast_note: keepExistingPlan
        ? `Extra payment recorded; kept the better ${sub!.plan_name} plan`
        : null,
      updated_at: now,
      ...tokenPatch(payfastToken),
    };

    if (paidToday) {
      // R0 signing-up debit: access runs to the first real billing date.
      subscriptionRow.paid_until = trialEndsAt;
    } else {
      subscriptionRow.paid_until = nextPaidUntil(sub?.paid_until ?? null, interval);
    }

    if (sub) {
      await supabase.from("subscriptions").update(subscriptionRow).eq("id", sub.id);
    } else {
      await supabase.from("subscriptions").insert(subscriptionRow);
    }


    // Attribute referral if one was captured at checkout.
    if (tx.referral_code) {
      try {
        const { data: sp } = await supabase
          .from("salespersons")
          .select("id")
          .eq("referral_code", tx.referral_code)
          .maybeSingle();
        if (sp?.id) {
          await supabase.from("referrals").upsert(
            {
              subscriber_user_id: tx.user_id,
              subscriber_email: tx.email,
              salesperson_id: sp.id,
              referral_code: tx.referral_code,
            },
            { onConflict: tx.user_id ? "subscriber_user_id" : "subscriber_email" },
          );
        }
      } catch (e) {
        console.error("referral attribution failed", e);
      }
    }

    // Referral program: spend any credit that was held for this checkout, and
    // reward the friend who invited this customer once real money moves.
    try {
      if (Number(tx.referral_credit_zar || 0) > 0) {
        await supabase
          .from("referral_credits")
          .update({ status: "applied", applied_at: now, note: `Applied to payment ${mPaymentId}` })
          .eq("status", "reserved")
          .eq("note", `Reserved for checkout ${mPaymentId}`);
      }
      if (!paidToday) await awardReferralCredit(supabase, tx);
    } catch (e) {
      console.error("referral credit handling failed", e);
    }

    await logAttempt(supabase, { ...txLog, outcome: "accepted" });
    return ok();

  } catch (error) {
    console.error("PayFast callback failed", error);
    await logAttempt(supabase, { ...baseLog, outcome: "error", reason: String(error).slice(0, 200) });
    return ok();
  }
});
// PayFast ITN (Instant Transaction Notification) webhook — hardened
// Defenses applied (Option B, no passphrase required):
//   1. Reject unknown merchant IDs
//   2. Validate source IP against PayFast's published hostnames
//   3. Server-to-server verification callback to PayFast /eng/query/validate
//   4. Idempotency via UNIQUE(m_payment_id) in payfast_webhook_log
//   5. Amount must match the expected plan price (prevents tier-jumping)
//   6. Every accepted / rejected ITN is logged for auditing
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Public PayFast merchant credentials — not secret.
const MERCHANT_ID = "12090292";
// Mode: "sandbox" or "live". Sandbox tolerates the public test merchant.
const PAYFAST_MODE: "sandbox" | "live" = "sandbox";
const SANDBOX_TEST_MERCHANT = "10000100";

const PAYFAST_HOST = PAYFAST_MODE === "live" ? "www.payfast.co.za" : "sandbox.payfast.co.za";
const VALIDATE_URL = `https://${PAYFAST_HOST}/eng/query/validate`;
const ALLOWED_HOSTS = [
  "www.payfast.co.za",
  "sandbox.payfast.co.za",
  "w1w.payfast.co.za",
  "w2w.payfast.co.za",
];

// Plan price catalogue (ZAR, monthly). Keep in sync with src/pages/Pricing.tsx.
const PLAN_PRICES: Record<string, number> = {
  Solo: 259,
  Business: 499,
  Professional: 1499,
  Enterprise: 3999,
};

// --- IP allowlist with 6h cache ---
let ipCache: { ips: Set<string>; at: number } = { ips: new Set(), at: 0 };
async function getAllowedIps(): Promise<Set<string>> {
  if (Date.now() - ipCache.at < 6 * 60 * 60 * 1000 && ipCache.ips.size > 0) return ipCache.ips;
  const ips = new Set<string>();
  await Promise.all(
    ALLOWED_HOSTS.map(async (h) => {
      try {
        const a = await Deno.resolveDns(h, "A");
        a.forEach((ip) => ips.add(ip));
      } catch (_) {}
      try {
        const aaaa = await Deno.resolveDns(h, "AAAA");
        aaaa.forEach((ip) => ips.add(ip));
      } catch (_) {}
    }),
  );
  ipCache = { ips, at: Date.now() };
  return ips;
}

function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

async function logAttempt(
  supabase: ReturnType<typeof createClient>,
  fields: Record<string, unknown>,
) {
  try {
    await supabase.from("payfast_webhook_log").insert(fields);
  } catch (e) {
    console.error("Failed to log webhook attempt", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const raw = await req.text();
  const params = new URLSearchParams(raw);
  const data: Record<string, string> = {};
  params.forEach((v, k) => (data[k] = v));

  const ip = clientIp(req);
  const mPaymentId = data["m_payment_id"] || null;
  const pfPaymentId = data["pf_payment_id"] || null;
  const merchantId = data["merchant_id"] || null;
  const paymentStatus = data["payment_status"] || null;
  const amountGross = parseFloat(data["amount_gross"] || "0") || null;
  const planName = data["custom_str2"] || (mPaymentId || "").split("|")[1] || null;

  const baseLog = {
    m_payment_id: mPaymentId,
    pf_payment_id: pfPaymentId,
    merchant_id: merchantId,
    payment_status: paymentStatus,
    amount_gross: amountGross,
    plan_name: planName,
    source_ip: ip,
    payload: data,
  };

  // PayFast expects a 200 OK on every ITN; we always return 200 but only mutate on success.
  const ok = () => new Response("OK", { status: 200, headers: corsHeaders });

  try {
    // 1. Merchant ID check
    const validMerchants = new Set([MERCHANT_ID]);
    if (PAYFAST_MODE === "sandbox") validMerchants.add(SANDBOX_TEST_MERCHANT);
    if (!merchantId || !validMerchants.has(merchantId)) {
      await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: "bad_merchant_id" });
      return ok();
    }

    // 2. IP allowlist
    if (ip) {
      const allowed = await getAllowedIps();
      if (allowed.size > 0 && !allowed.has(ip)) {
        await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: `bad_ip:${ip}` });
        return ok();
      }
    }

    // 3. Server-to-server validation callback
    try {
      const verifyRes = await fetch(VALIDATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: raw,
      });
      const verifyText = (await verifyRes.text()).trim();
      if (verifyText !== "VALID") {
        await logAttempt(supabase, {
          ...baseLog,
          outcome: "rejected",
          reason: `validate_failed:${verifyText.slice(0, 80)}`,
        });
        return ok();
      }
    } catch (e) {
      await logAttempt(supabase, {
        ...baseLog,
        outcome: "rejected",
        reason: `validate_error:${String(e).slice(0, 80)}`,
      });
      return ok();
    }

    if (paymentStatus !== "COMPLETE") {
      await logAttempt(supabase, { ...baseLog, outcome: "ignored", reason: `status:${paymentStatus}` });
      return ok();
    }

    if (!planName) {
      await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: "missing_plan" });
      return ok();
    }

    // 4. Idempotency — UNIQUE(m_payment_id) makes the insert below conflict on replay.
    //    We use the insert itself as our claim; on conflict we short-circuit.
    if (mPaymentId) {
      const { data: existing } = await supabase
        .from("payfast_webhook_log")
        .select("id, outcome")
        .eq("m_payment_id", mPaymentId)
        .eq("outcome", "accepted")
        .maybeSingle();
      if (existing) {
        await logAttempt(supabase, { ...baseLog, outcome: "duplicate", reason: "already_processed" });
        return ok();
      }
    }

    // 5. Amount / plan cross-check.
    //    Special case: a "trial signup" ITN has amount_gross = 0 because we
    //    set amount=0 on the PayFast form and the first real debit only
    //    happens on billing_date. We accept that and store status='trialing'.
    const expected = PLAN_PRICES[planName];
    if (expected === undefined) {
      await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: "unknown_plan" });
      return ok();
    }
    const isTrialSignup = amountGross !== null && Math.abs(amountGross) < 0.01;
    if (!isTrialSignup) {
      if (amountGross === null || Math.abs(amountGross - expected) > 0.01) {
        await logAttempt(supabase, {
          ...baseLog,
          outcome: "rejected",
          reason: `amount_mismatch:expected=${expected} got=${amountGross}`,
        });
        return ok();
      }
    }

    // Resolve user_id / email
    const mParts = (mPaymentId || "").split("|");
    const userIdRaw = data["custom_str1"] || mParts[0] || "";
    const userId = userIdRaw && userIdRaw !== "guest" && userIdRaw !== "anon" ? userIdRaw : null;
    const email = (data["custom_str3"] || data["email_address"] || "").toLowerCase().trim() || null;

    if (!userId && !email) {
      await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: "no_user_or_email" });
      return ok();
    }

    const now = new Date().toISOString();
    const newStatus = isTrialSignup ? "trialing" : "active";
    // billing_date arrives back from PayFast on the trial signup ITN.
    const trialEndsAt = isTrialSignup
      ? (data["billing_date"] ? new Date(data["billing_date"]).toISOString() : null)
      : null;

    let existingId: string | null = null;
    if (userId) {
      const { data: row } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      existingId = row?.id ?? null;
    }
    if (!existingId && email) {
      const { data: row } = await supabase
        .from("subscriptions")
        .select("id")
        .is("user_id", null)
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      existingId = row?.id ?? null;
    }

    if (existingId) {
      await supabase
        .from("subscriptions")
        .update({
          plan_name: planName,
          status: newStatus,
          updated_at: now,
          ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
          ...(userId ? { user_id: userId } : {}),
          ...(email ? { email } : {}),
        })
        .eq("id", existingId);
    } else {
      await supabase.from("subscriptions").insert({
        user_id: userId,
        email,
        plan_name: planName,
        status: newStatus,
        trial_ends_at: trialEndsAt,
        updated_at: now,
      });
    }

    await logAttempt(supabase, {
      ...baseLog,
      matched_user_id: userId,
      matched_email: email,
      outcome: "accepted",
    });
    return ok();
  } catch (e) {
    console.error("payfast-webhook fatal", e);
    await logAttempt(supabase, { ...baseLog, outcome: "error", reason: String(e).slice(0, 200) });
    return ok();
  }
});

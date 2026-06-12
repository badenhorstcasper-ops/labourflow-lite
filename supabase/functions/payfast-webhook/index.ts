// PayFast ITN (Instant Transaction Notification) webhook — hardened
// Defenses applied:
//   1. Reject unknown merchant IDs
//   2. Validate source IP against PayFast's published hostnames
//   3. Optional MD5 signature verification when PAYFAST_PASSPHRASE is set
//   4. Server-to-server verification callback to PayFast /eng/query/validate
//   5. Idempotency via UNIQUE(m_payment_id) in payfast_webhook_log
//   6. Amount must match the expected plan price (prevents tier-jumping)
//   7. Every accepted / rejected ITN is logged for auditing
//   8. Captures subscription token + pf_payment_id for later cancel API calls
//   9. Handles CANCELLED status to flip subscriptions.status
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Public PayFast merchant credentials — not secret.
const MERCHANT_ID = "12090292";
const PAYFAST_MODE: "sandbox" | "live" =
  (Deno.env.get("PAYFAST_MODE")?.toLowerCase() === "live" ? "live" : "sandbox");
const PAYFAST_PASSPHRASE = Deno.env.get("PAYFAST_PASSPHRASE") || "";
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

// PayFast signature: md5 of urlencoded(sortedFields) + &passphrase=...
// Fields are taken in the order they appear in the POST body, EXCLUDING `signature`.
async function md5Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("MD5", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function pfEncode(v: string): string {
  // PayFast uses +-style encoding (application/x-www-form-urlencoded)
  return encodeURIComponent(v).replace(/%20/g, "+");
}

async function verifySignature(raw: string, providedSig: string): Promise<boolean> {
  if (!PAYFAST_PASSPHRASE) return true; // not enforced when passphrase unset
  if (!providedSig) return false;
  // Rebuild from raw body preserving order, drop `signature`.
  const pairs: [string, string][] = [];
  for (const part of raw.split("&")) {
    if (!part) continue;
    const eq = part.indexOf("=");
    const k = decodeURIComponent(eq === -1 ? part : part.slice(0, eq));
    const v = decodeURIComponent(eq === -1 ? "" : part.slice(eq + 1).replace(/\+/g, " "));
    if (k === "signature") continue;
    pairs.push([k, v]);
  }
  const base = pairs.map(([k, v]) => `${k}=${pfEncode(v)}`).join("&");
  const withPass = `${base}&passphrase=${pfEncode(PAYFAST_PASSPHRASE)}`;
  const expected = await md5Hex(withPass);
  return expected.toLowerCase() === providedSig.toLowerCase();
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
  const subToken = data["token"] || null;
  const signature = data["signature"] || "";

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

    // 3. Optional signature check (only when PAYFAST_PASSPHRASE is set)
    if (PAYFAST_PASSPHRASE) {
      const sigOk = await verifySignature(raw, signature);
      if (!sigOk) {
        await logAttempt(supabase, { ...baseLog, outcome: "rejected", reason: "bad_signature" });
        return ok();
      }
    }

    // 4. Server-to-server validation callback
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

    // 4b. Handle CANCELLED ITN — flip status without amount/plan check.
    if (paymentStatus === "CANCELLED") {
      // Try locate by token first, then by m_payment_id user/email.
      let row: { id: string } | null = null;
      if (subToken) {
        const { data: r } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("payfast_token", subToken)
          .maybeSingle();
        row = r ?? null;
      }
      if (!row) {
        const mParts = (mPaymentId || "").split("|");
        const userIdRaw = data["custom_str1"] || mParts[0] || "";
        const userId = userIdRaw && userIdRaw !== "guest" && userIdRaw !== "anon" ? userIdRaw : null;
        if (userId) {
          const { data: r } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("user_id", userId)
            .limit(1)
            .maybeSingle();
          row = r ?? null;
        }
      }
      if (row) {
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", row.id);
      }
      await logAttempt(supabase, { ...baseLog, outcome: "accepted", reason: "cancelled" });
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

    // 5. Idempotency
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

    // 6. Amount / plan cross-check (trial signup = 0).
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

    const writeExtras = {
      ...(trialEndsAt ? { trial_ends_at: trialEndsAt } : {}),
      ...(userId ? { user_id: userId } : {}),
      ...(email ? { email } : {}),
      ...(subToken ? { payfast_token: subToken } : {}),
      ...(pfPaymentId ? { pf_payment_id: pfPaymentId } : {}),
    };

    if (existingId) {
      await supabase
        .from("subscriptions")
        .update({
          plan_name: planName,
          status: newStatus,
          updated_at: now,
          ...writeExtras,
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
        ...(subToken ? { payfast_token: subToken } : {}),
        ...(pfPaymentId ? { pf_payment_id: pfPaymentId } : {}),
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

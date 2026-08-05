import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

export type PlanName = "Solo" | "Business" | "Professional";

export const PLAN_PRICES: Record<PlanName, number> = {
  Solo: 259,
  Business: 599,
  Professional: 1499,
};

export const PLAN_NAMES = new Set<PlanName>(["Solo", "Business", "Professional"]);

/** PayFast payment_method values we let the app pre-select. */
export const ALLOWED_PAYMENT_METHODS = new Set(["ap", "gp", "mp"]);

const LIVE_MERCHANT_ID = "12090292";
const LIVE_MERCHANT_KEY = "3xbkln8wrhwqj";
const SANDBOX_MERCHANT_ID = "10000100";
const SANDBOX_MERCHANT_KEY = "46f0cd694581a";

export function pfEncode(value: string) {
  // Must match PHP's urlencode(), which PayFast uses to build the signature.
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

export async function payfastSignature(fields: Record<string, string>, passphrase: string) {
  const base = Object.entries(fields)
    .filter(([key, value]) => key !== "signature" && value !== "")
    .map(([key, value]) => `${key}=${pfEncode(value)}`)
    .join("&");

  const withPassphrase = passphrase.trim()
    ? `${base}&passphrase=${pfEncode(passphrase)}`
    : base;

  return md5Hex(withPassphrase);
}

export async function signFields(fields: Record<string, string>, passphrase: string) {
  return { ...fields, signature: await payfastSignature(fields, passphrase) };
}

export function payfastCredentials() {
  const mode = Deno.env.get("PAYFAST_MODE")?.toLowerCase() === "live" ? "live" : "sandbox";
  const merchantId = mode === "live"
    ? (Deno.env.get("PAYFAST_MERCHANT_ID") || LIVE_MERCHANT_ID).trim()
    : SANDBOX_MERCHANT_ID;
  const envKey = (Deno.env.get("PAYFAST_MERCHANT_KEY") || "").trim();
  const merchantKey = mode === "live"
    ? (envKey.length === 13 ? envKey : LIVE_MERCHANT_KEY)
    : SANDBOX_MERCHANT_KEY;
  const passphrase = (Deno.env.get("PAYFAST_PASSPHRASE_V2") || Deno.env.get("PAYFAST_PASSPHRASE") || "").trim();
  const actionUrl = mode === "live"
    ? "https://www.payfast.co.za/eng/process"
    : "https://sandbox.payfast.co.za/eng/process";
  return { mode, merchantId, merchantKey, passphrase, actionUrl };
}

export function safeOrigin(req: Request) {
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

/**
 * Builds the PayFast form fields in the exact order PayFast documents, because
 * the MD5 signature is calculated over the fields in that order.
 */
export function buildCheckoutFields(params: {
  merchantId: string;
  merchantKey: string;
  origin: string;
  notifyUrl: string;
  email: string;
  mPaymentId: string;
  planName: string;
  amountToday: number;
  recurringAmount: number;
  billingDate: string;
  itemName: string;
  referralCode?: string | null;
  paymentMethod?: string | null;
}): Record<string, string> {
  const fields: Record<string, string> = {
    merchant_id: params.merchantId,
    merchant_key: params.merchantKey,
    return_url: `${params.origin}/payment-success?m=${encodeURIComponent(params.mPaymentId)}`,
    cancel_url: `${params.origin}/payment-cancelled?m=${encodeURIComponent(params.mPaymentId)}`,
    notify_url: params.notifyUrl,
    email_address: params.email,
    m_payment_id: params.mPaymentId,
    amount: params.amountToday.toFixed(2),
    item_name: params.itemName,
    item_description: "iNRECO Pocket Consultant subscription access",
  };
  if (params.referralCode) fields.custom_str1 = params.referralCode;
  if (params.paymentMethod && ALLOWED_PAYMENT_METHODS.has(params.paymentMethod)) {
    fields.payment_method = params.paymentMethod;
  }
  fields.subscription_type = "1";
  fields.billing_date = params.billingDate;
  fields.recurring_amount = params.recurringAmount.toFixed(2);
  fields.frequency = "3";
  fields.cycles = "0";
  return fields;
}

export function checkoutItemName(planName: string, payNow: boolean, trialDays: number) {
  return payNow
    ? `iNRECO Pocket Consultant - ${planName}`
    : `iNRECO Pocket Consultant - ${planName} (${trialDays}-day free trial)`;
}

/* ------------------------------------------------------------------ *
 * PayFast merchant API (subscription lookup + payment history)
 * ------------------------------------------------------------------ */

const API_HOST_LIVE = "api.payfast.co.za";
const API_HOST_SANDBOX = "sandbox.payfast.co.za";

/** Signs a PayFast API call: all header fields + query params, sorted A-Z. */
async function apiSignature(fields: Record<string, string>, passphrase: string) {
  const base = Object.keys(fields)
    .sort()
    .map((key) => `${key}=${pfEncode(fields[key])}`)
    .join("&");
  const withPass = passphrase ? `${base}&passphrase=${pfEncode(passphrase)}` : base;
  return md5Hex(withPass);
}

async function payfastApi(path: string, query: Record<string, string> = {}) {
  const { mode, merchantId, passphrase } = payfastCredentials();
  const host = mode === "live" ? API_HOST_LIVE : API_HOST_SANDBOX;
  const timestamp = new Date().toISOString();
  const headerFields: Record<string, string> = {
    "merchant-id": merchantId,
    version: "v1",
    timestamp,
  };
  const signature = await apiSignature({ ...headerFields, ...query }, passphrase);
  const search = new URLSearchParams({ ...query, testing: mode === "sandbox" ? "true" : "false" });
  const res = await fetch(`https://${host}${path}?${search.toString()}`, {
    method: "GET",
    headers: { ...headerFields, signature, accept: "application/json" },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

export type PayfastSubscriptionState = {
  /** "running" | "stopped" | "unknown" — what PayFast says about the arrangement. */
  state: "running" | "stopped" | "unknown";
  /** Next payment date PayFast holds, if any (YYYY-MM-DD). */
  runDate: string | null;
  detail: string;
};

/** Asks PayFast whether a subscription is still running. */
export async function fetchPayfastSubscription(token: string): Promise<PayfastSubscriptionState> {
  try {
    const { ok, status, text } = await payfastApi(`/subscriptions/${encodeURIComponent(token)}/fetch`);
    if (!ok) {
      // 404 means PayFast has no such arrangement — that is a real "stopped".
      if (status === 404) return { state: "stopped", runDate: null, detail: "not_found" };
      return { state: "unknown", runDate: null, detail: `http_${status}:${text.slice(0, 120)}` };
    }
    const body = JSON.parse(text);
    const payload = body?.data?.response ?? body?.data ?? body;
    const raw = payload?.status;
    const runDate: string | null = payload?.run_date
      ? String(payload.run_date).slice(0, 10)
      : null;
    // PayFast: 1 = active, 2 = cancelled, 3 = paused.
    const numeric = Number(raw);
    if (numeric === 1) return { state: "running", runDate, detail: "active" };
    if (numeric === 2 || numeric === 3) {
      return { state: "stopped", runDate, detail: numeric === 2 ? "cancelled" : "paused" };
    }
    return { state: "unknown", runDate, detail: `status:${String(raw)}` };
  } catch (error) {
    return { state: "unknown", runDate: null, detail: `error:${String(error).slice(0, 120)}` };
  }
}

export type PayfastHistoryHit = { token: string | null; date: string; amount: number };

/**
 * Scans PayFast's recent daily payment history for a customer's payments.
 * Used when we never captured a card reference for someone.
 */
export async function findRecentPayfastPayments(
  email: string,
  days = 45,
): Promise<PayfastHistoryHit[]> {
  const needle = email.trim().toLowerCase();
  const hits: PayfastHistoryHit[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
    try {
      const { ok, text } = await payfastApi("/transactions/history/daily", { date: day });
      if (!ok || !text) continue;
      if (!text.toLowerCase().includes(needle)) continue;
      for (const line of text.split(/\r?\n/)) {
        if (!line.toLowerCase().includes(needle)) continue;
        const cells = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
        const token = cells.find((c) => /^[0-9a-f-]{30,40}$/i.test(c)) ?? null;
        const amount = cells.map(Number).find((n) => Number.isFinite(n) && n > 0) ?? 0;
        hits.push({ token, date: day, amount });
      }
    } catch (_) {
      // A bad day of history must never stop the sweep.
    }
  }
  return hits;
}

/** Adds whole months/years, clamping to the end of short months. */
export function addPeriod(from: Date, interval: "monthly" | "yearly") {
  const result = new Date(from.getTime());
  const day = result.getUTCDate();
  if (interval === "yearly") result.setUTCFullYear(result.getUTCFullYear() + 1);
  else result.setUTCMonth(result.getUTCMonth() + 1);
  if (result.getUTCDate() < day) result.setUTCDate(0); // rolled over: pull back to month end
  return result;
}

/** Later of "now" and the date already paid for, then one billing period on. */
export function nextPaidUntil(currentPaidUntil: string | null, interval: "monthly" | "yearly") {
  const now = new Date();
  const current = currentPaidUntil ? new Date(currentPaidUntil) : null;
  const base = current && current.getTime() > now.getTime() ? current : now;
  return addPeriod(base, interval).toISOString();
}

/** Plan ranking so a cheaper or once-off purchase can never demote a live plan. */
export const PLAN_RANK: Record<string, number> = {
  Solo: 1,
  Business: 2,
  Professional: 3,
  Enterprise: 4,
};

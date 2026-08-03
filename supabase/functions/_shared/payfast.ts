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

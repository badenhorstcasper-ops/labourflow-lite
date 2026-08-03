import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export type CheckoutResponse = {
  actionUrl?: string;
  fields?: Record<string, string>;
  billingDate?: string;
  mPaymentId?: string;
};

/** PayFast payment_method values we can pre-select for the buyer. */
export type WalletMethod = "ap" | "gp" | "mp";

export async function functionErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const text = await error.context.text();
    try {
      const parsed = JSON.parse(text) as { error?: string; details?: string };
      if (parsed.error?.includes("13-character merchant key")) {
        return "Checkout is being finalised. Please try again in a minute — if it persists, WhatsApp 084 402 7029.";
      }
      return [parsed.error, parsed.details].filter(Boolean).join(" ") || text;
    } catch (_) {
      return text || error.message;
    }
  }
  return error instanceof Error ? error.message : "Checkout could not start. Please try again.";
}

export function submitPreparedCheckout(actionUrl: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = actionUrl;
  Object.entries(fields).forEach(([name, value]) => {
    if (!value) return;
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

export async function createCheckout(params: {
  planName: string;
  email: string;
  mode: "trial" | "now";
  referralCode?: string | null;
  paymentMethod?: WalletMethod | null;
}): Promise<CheckoutResponse> {
  const { data, error } = await supabase.functions.invoke<CheckoutResponse>("payfast-checkout", {
    body: {
      planName: params.planName,
      email: params.email,
      mode: params.mode,
      referralCode: params.referralCode || undefined,
      paymentMethod: params.paymentMethod || undefined,
    },
  });
  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.actionUrl || !data.fields) {
    throw new Error("Checkout could not start. Please try again.");
  }
  return data;
}

export function rememberPendingCheckout(email: string, planName: string, mPaymentId?: string) {
  try {
    localStorage.setItem("inreco.pendingInstallPrompt", "1");
    localStorage.setItem("inreco.pendingEmail", email);
    localStorage.setItem("inreco.pendingPlan", planName);
    if (mPaymentId) localStorage.setItem("inreco.pendingPayment", mPaymentId);
  } catch (_) {
    // Checkout still works if storage is blocked.
  }
}

/** True on Safari / Apple devices, where Apple Pay is the familiar option. */
export function supportsApplePay() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isApple = /iPhone|iPad|iPod|Macintosh/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Chromium|Edg|OPR|Android/.test(ua);
  const hasApi = "ApplePaySession" in window;
  return hasApi || (isApple && isSafari);
}

/** True on Chrome (desktop or Android) and other Android browsers. */
export function supportsGooglePay() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isAndroid = /Android/.test(ua);
  const isChrome = /Chrome|CriOS|Chromium|Edg/.test(ua);
  return isAndroid || isChrome;
}

/** The page a phone lands on when it scans the payment code. */
export function payLinkFor(reference: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://app.inreco.co.za";
  return `${origin}/pay/${reference}`;
}

/** A scan code stops working after this long, matching the server. */
export const SCAN_SESSION_MS = 30 * 60 * 1000;

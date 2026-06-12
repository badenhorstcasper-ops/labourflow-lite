// Cancels the caller's PayFast subscription.
// - Verifies the caller's JWT in code.
// - Looks up the caller's subscriptions row.
// - If a payfast_token + PAYFAST_PASSPHRASE are configured, calls PayFast's
//   subscription cancel API. Otherwise marks the local row as cancelled only
//   (useful in sandbox / before tokens are captured).
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MERCHANT_ID = "12090292";
const PAYFAST_MODE: "sandbox" | "live" =
  (Deno.env.get("PAYFAST_MODE")?.toLowerCase() === "live" ? "live" : "sandbox");
const PAYFAST_PASSPHRASE = Deno.env.get("PAYFAST_PASSPHRASE") || "";
const API_HOST = PAYFAST_MODE === "live" ? "api.payfast.co.za" : "sandbox.payfast.co.za";

async function md5Hex(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("MD5", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
function pfEncode(v: string): string {
  return encodeURIComponent(v).replace(/%20/g, "+");
}

async function callPayfastCancel(token: string): Promise<{ ok: boolean; detail: string }> {
  const timestamp = new Date().toISOString();
  const fields: Record<string, string> = {
    "merchant-id": MERCHANT_ID,
    version: "v1",
    timestamp,
  };
  // Signature: alphabetical sort of fields + passphrase, MD5.
  const sorted = Object.keys(fields).sort();
  const base = sorted.map((k) => `${k}=${pfEncode(fields[k])}`).join("&");
  const withPass = PAYFAST_PASSPHRASE
    ? `${base}&passphrase=${pfEncode(PAYFAST_PASSPHRASE)}`
    : base;
  const signature = await md5Hex(withPass);

  const url = `https://${API_HOST}/subscriptions/${encodeURIComponent(token)}/cancel?testing=${PAYFAST_MODE === "sandbox" ? "true" : "false"}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "merchant-id": MERCHANT_ID,
      version: "v1",
      timestamp,
      signature,
      accept: "application/json",
    },
  });
  const text = await res.text();
  return { ok: res.ok, detail: text.slice(0, 200) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claims.claims.sub as string;

  // Find caller's subscription (most recent).
  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .select("id, payfast_token, status")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subErr || !sub) {
    return new Response(JSON.stringify({ error: "no_subscription" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let remoteDetail = "skipped_no_token_or_passphrase";
  let remoteOk = true;
  if (sub.payfast_token && PAYFAST_PASSPHRASE) {
    const r = await callPayfastCancel(sub.payfast_token);
    remoteOk = r.ok;
    remoteDetail = r.detail;
    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: "payfast_cancel_failed", detail: remoteDetail }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  }

  await admin
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", sub.id);

  return new Response(
    JSON.stringify({ ok: true, remoteOk, remoteDetail }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

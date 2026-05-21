// PayFast ITN (Instant Transaction Notification) webhook
// Receives POST notifications from PayFast and activates the user's subscription.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // PayFast ITN posts as application/x-www-form-urlencoded
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const data: Record<string, string> = {};
    params.forEach((v, k) => (data[k] = v));

    console.log("PayFast ITN received:", data);

    const paymentStatus = data["payment_status"];
    if (paymentStatus !== "COMPLETE") {
      // Acknowledge but do not activate
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    // m_payment_id format: "<user_id>|<plan>|<timestamp>"
    // Also supports custom_str1 = user_id, custom_str2 = plan
    const userId = data["custom_str1"] || (data["m_payment_id"] || "").split("|")[0];
    const planName = data["custom_str2"] || (data["m_payment_id"] || "").split("|")[1];

    if (!userId || !planName) {
      console.error("Missing user_id or plan_name in ITN", data);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Upsert: keep a single active subscription row per user
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    if (existing?.id) {
      await supabase
        .from("subscriptions")
        .update({ plan_name: planName, status: "active", updated_at: now })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("subscriptions")
        .insert({ user_id: userId, plan_name: planName, status: "active", updated_at: now });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("payfast-webhook error", e);
    // Still return 200 so PayFast doesn't retry indefinitely
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});

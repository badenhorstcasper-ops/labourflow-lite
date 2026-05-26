// PayFast ITN (Instant Transaction Notification) webhook
// Receives POST notifications from PayFast and activates the user's subscription.
// Supports both:
//  - Logged-in checkout (custom_str1 = user_id)
//  - Guest checkout (custom_str3 = email; user_id linked on signup via trigger)
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
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    const data: Record<string, string> = {};
    params.forEach((v, k) => (data[k] = v));

    console.log("PayFast ITN received:", data);

    const paymentStatus = data["payment_status"];
    if (paymentStatus !== "COMPLETE") {
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const mParts = (data["m_payment_id"] || "").split("|");
    const userIdRaw = data["custom_str1"] || mParts[0] || "";
    const userId = userIdRaw && userIdRaw !== "guest" && userIdRaw !== "anon" ? userIdRaw : null;
    const planName = data["custom_str2"] || mParts[1] || "";
    const email = (data["custom_str3"] || data["email_address"] || "").toLowerCase().trim() || null;

    if (!planName) {
      console.error("Missing plan_name in ITN", data);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }
    if (!userId && !email) {
      console.error("Missing both user_id and email in ITN", data);
      return new Response("OK", { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const now = new Date().toISOString();

    // Try to find an existing subscription row by user_id first, then by email
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
          status: "active",
          updated_at: now,
          ...(userId ? { user_id: userId } : {}),
          ...(email ? { email } : {}),
        })
        .eq("id", existingId);
    } else {
      await supabase.from("subscriptions").insert({
        user_id: userId,
        email,
        plan_name: planName,
        status: "active",
        updated_at: now,
      });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error("payfast-webhook error", e);
    return new Response("OK", { status: 200, headers: corsHeaders });
  }
});

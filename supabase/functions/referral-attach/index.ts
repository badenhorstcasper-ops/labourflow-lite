// Ties a newly signed-up account to the invite link it came from.
// Runs the anti-abuse checks (self-referral, same email, same device) before
// recording anything.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anon) return json({ error: "Not ready" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Not signed in" }, 401);

  const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await asUser.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: "Not signed in" }, 401);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch (_) { /* empty body is fine */ }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const deviceId = typeof body.deviceId === "string" ? body.deviceId.slice(0, 200) : null;
  if (!/^RE-[A-Z0-9]{4,10}$/.test(code)) return json({ ok: false, final: true, reason: "invalid_code" });

  const admin = createClient(url, serviceKey);

  // Already attached? Attribution is permanent — never move it.
  const { data: existing } = await admin
    .from("referral_signups")
    .select("id, status")
    .eq("referred_user_id", user.id)
    .maybeSingle();
  if (existing) return json({ ok: true, final: true, reason: "already_attached" });

  const { data: owner } = await admin
    .from("referral_codes")
    .select("user_id")
    .eq("code", code)
    .maybeSingle();
  if (!owner?.user_id) return json({ ok: false, final: true, reason: "unknown_code" });

  const referrerId = owner.user_id as string;
  const email = (user.email || "").toLowerCase();

  // --- anti-abuse checks -----------------------------------------------
  let blocked: string | null = null;
  if (referrerId === user.id) blocked = "self_referral";

  if (!blocked) {
    const { data: referrer } = await admin.auth.admin.getUserById(referrerId);
    const refEmail = (referrer?.user?.email || "").toLowerCase();
    if (refEmail && refEmail === email) blocked = "same_email";
  }

  if (!blocked && deviceId) {
    const { data: sharedDevice } = await admin
      .from("user_devices")
      .select("id")
      .eq("user_id", referrerId)
      .eq("device_id", deviceId)
      .maybeSingle();
    if (sharedDevice) blocked = "same_device";
  }

  // Only genuinely new accounts qualify: no subscription history yet.
  if (!blocked) {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (sub) blocked = "existing_customer";
  }

  const { error } = await admin.from("referral_signups").insert({
    referrer_user_id: referrerId,
    referred_user_id: user.id,
    referred_email: email,
    code,
    device_id: deviceId,
    status: blocked ? "blocked" : "pending",
    blocked_reason: blocked,
  });
  if (error) {
    console.error("referral-attach insert failed", error);
    return json({ error: "Could not record the invite" }, 500);
  }

  return json({ ok: !blocked, final: true, reason: blocked ?? "attached", trialDays: blocked ? 7 : 14 });
});

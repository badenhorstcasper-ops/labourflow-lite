import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/** How long a card-free trial lasts. Invited friends get double. */
const TRIAL_DAYS = 7;
const REFERRED_TRIAL_DAYS = 14;
const PLANS = new Set(["Solo", "Business", "Professional", "Enterprise"]);

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: "Trials are not available right now." }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Not signed in" }, 401);

  const authed = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimData, error: claimError } = await authed.auth.getClaims(
    authHeader.replace("Bearer ", ""),
  );
  const userId = claimData?.claims?.sub as string | undefined;
  const email = typeof claimData?.claims?.email === "string" ? claimData.claims.email.toLowerCase() : "";
  if (claimError || !userId) return json({ error: "Not signed in" }, 401);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch (_) {
    body = {};
  }
  const requested = typeof body.planName === "string" ? body.planName : "Solo";
  const planName = PLANS.has(requested) ? requested : "Solo";

  const admin = createClient(supabaseUrl, serviceKey);

  // Never start a second trial for the same person or the same email address.
  const { data: existing } = await admin
    .from("subscriptions")
    .select("id, status, plan_name, trial_ends_at, user_id")
    .or(`user_id.eq.${userId}${email ? `,email.ilike.${email}` : ""}`)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    // Attach an older, email-only record to this account so they keep their plan.
    if (!existing.user_id) {
      await admin
        .from("subscriptions")
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    return json({
      started: false,
      alreadyHad: true,
      status: existing.status,
      planName: existing.plan_name,
      trialEndsAt: existing.trial_ends_at,
    });
  }

  // Someone who arrived through a friend's invite link gets 14 free days.
  let days = TRIAL_DAYS;
  const { data: invited } = await admin
    .from("referral_signups")
    .select("id")
    .eq("referred_user_id", userId)
    .neq("status", "blocked")
    .maybeSingle();
  if (invited?.id) days = REFERRED_TRIAL_DAYS;

  const trialEndsAt = new Date(Date.now() + days * 86400000).toISOString();
  const { error: insertError } = await admin.from("subscriptions").insert({
    user_id: userId,
    email,
    plan_name: planName,
    status: "trialing",
    trial_ends_at: trialEndsAt,
  });

  if (insertError) {
    console.error("Could not start trial", insertError);
    return json({ error: "Could not start your free trial. Please try again." }, 500);
  }

  return json({ started: true, planName, trialEndsAt, days });
});

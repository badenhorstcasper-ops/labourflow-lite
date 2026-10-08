// Once a day: emails each trial user individually when their trial is
// 2 days from ending, and again on the day it ends. Duplicate-safe via
// per-user idempotency keys.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const DAY = 24 * 60 * 60 * 1000;
const EXCLUDED = [/@inrecotest\.co\.za$/i];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey);
  const now = Date.now();

  const { data: subs, error } = await admin
    .from("subscriptions")
    .select("id, user_id, email, trial_ends_at, status, is_demo")
    .eq("status", "trialing")
    .eq("is_demo", false)
    .gte("trial_ends_at", new Date(now - DAY).toISOString())
    .lte("trial_ends_at", new Date(now + 2 * DAY).toISOString())
    .limit(500);
  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  for (const s of subs ?? []) {
    if (!s.email || EXCLUDED.some((r) => r.test(s.email))) continue;
    if (s.user_id) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: s.user_id, _role: "admin" });
      if (isAdmin) continue;
    }
    const endsAt = new Date(s.trial_ends_at).getTime();
    const left = endsAt - now;
    let stage: "soon" | "ended" | null = null;
    if (left > DAY && left <= 2 * DAY) stage = "soon";
    else if (left <= 0 && left > -DAY) stage = "ended";
    if (!stage) continue;

    let companyName: string | undefined;
    if (s.user_id) {
      const { data: cp } = await admin
        .from("company_profiles").select("company_name").eq("owner_user_id", s.user_id).maybeSingle();
      companyName = cp?.company_name?.trim() || undefined;
    }

    const { error: sendErr } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "trial-ending",
        recipientEmail: s.email,
        idempotencyKey: `trial-${stage}-${s.id}`,
        templateData: { stage, daysLeft: 2, companyName },
      },
    });
    if (sendErr) console.error("trial reminder failed", s.id, sendErr.message);
    else sent++;
  }
  return json({ checked: subs?.length ?? 0, sent });
});

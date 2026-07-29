// Runs daily. Any active partner whose referral code has produced ZERO
// paid subscribers in the last 90 days has their silent demo access switched
// off. Their referral code stays alive — the next subscriber reactivates them.

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

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!url || !key) return json({ error: "Server not ready" }, 500);

  // Optional shared secret so only the cron job (or an admin) can trigger it.
  const provided = req.headers.get("x-cron-secret");
  if (cronSecret && provided !== cronSecret) {
    return json({ error: "Forbidden" }, 403);
  }

  const admin = createClient(url, key);
  const now = new Date();
  const NINETY = new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString();

  const { data: partners, error } = await admin
    .from("salespersons")
    .select("id, email, full_name, approved_at")
    .eq("status", "active")
    .not("approved_at", "is", null)
    .lt("approved_at", NINETY);
  if (error) return json({ error: error.message }, 500);

  const revoked: { id: string; email: string; full_name: string }[] = [];

  for (const p of partners ?? []) {
    const { count } = await admin
      .from("referrals")
      .select("*", { count: "exact", head: true })
      .eq("salesperson_id", p.id)
      .gte("created_at", NINETY);
    if ((count ?? 0) > 0) continue;

    // Switch off the demo subscription only (never touch a real paid one).
    await admin
      .from("subscriptions")
      .update({ status: "inactive", updated_at: now.toISOString() })
      .ilike("email", (p.email as string).toLowerCase())
      .eq("is_demo", true);

    await admin
      .from("salespersons")
      .update({ demo_revoked_at: now.toISOString(), updated_at: now.toISOString() })
      .eq("id", p.id);

    revoked.push({ id: p.id, email: p.email as string, full_name: p.full_name as string });
  }

  // Clean up provisional access that PayFast never confirmed. `provisional_until`
  // is cleared the moment a real payment notification arrives, so anything still
  // set and in the past means no confirmation ever came.
  const { data: stale } = await admin
    .from("subscriptions")
    .select("id, email")
    .not("provisional_until", "is", null)
    .lt("provisional_until", now.toISOString());

  for (const s of stale ?? []) {
    await admin
      .from("subscriptions")
      .update({ status: "pending", provisional_until: null, updated_at: now.toISOString() })
      .eq("id", s.id);
  }

  return json({
    ok: true,
    revoked_count: revoked.length,
    revoked,
    provisional_expired: (stale ?? []).length,
  });
});

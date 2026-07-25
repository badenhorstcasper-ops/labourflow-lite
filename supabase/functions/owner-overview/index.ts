// Admin-only overview: subscriber counts by tier, direct vs partner-attributed
// signups, and a league table of every partner.

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
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key || !anon) return json({ error: "Server not ready" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Not signed in" }, 401);

  const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await asUser.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return json({ error: "Not signed in" }, 401);
  const { data: isAdmin } = await asUser.rpc("has_role", { _user_id: uid, _role: "admin" });
  if (!isAdmin) return json({ error: "Admins only" }, 403);

  const admin = createClient(url, key);
  const now = new Date();
  const NINETY = new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString();
  const THIRTY = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

  // Active, non-demo subscribers
  const { data: subs } = await admin
    .from("subscriptions")
    .select("id, email, plan_name, status, is_demo")
    .eq("status", "active");

  const paidSubs = (subs ?? []).filter((s) => !s.is_demo);
  const tierCounts = { Solo: 0, Business: 0, Professional: 0, Enterprise: 0 } as Record<string, number>;
  for (const s of paidSubs) {
    const p = (s.plan_name as string) || "Solo";
    if (tierCounts[p] === undefined) tierCounts[p] = 0;
    tierCounts[p]++;
  }

  // Partner-attributed vs direct
  const { data: refs } = await admin
    .from("referrals")
    .select("subscriber_email, salesperson_id, created_at");
  const attributedEmails = new Set((refs ?? []).map((r) => (r.subscriber_email as string || "").toLowerCase()).filter(Boolean));
  const partnerSubs = paidSubs.filter((s) => attributedEmails.has((s.email as string || "").toLowerCase())).length;
  const directSubs = paidSubs.length - partnerSubs;

  // Partner league table
  const { data: partners } = await admin
    .from("salespersons")
    .select("id, full_name, email, referral_code, status, approved_at, demo_revoked_at")
    .order("created_at", { ascending: false });

  const byPartner: Record<string, { total: number; last30: number; last90: number }> = {};
  for (const r of refs ?? []) {
    const spId = r.salesperson_id as string;
    if (!spId) continue;
    if (!byPartner[spId]) byPartner[spId] = { total: 0, last30: 0, last90: 0 };
    byPartner[spId].total++;
    if ((r.created_at as string) >= NINETY) byPartner[spId].last90++;
    if ((r.created_at as string) >= THIRTY) byPartner[spId].last30++;
  }

  const league = (partners ?? []).map((p) => {
    const stat = byPartner[p.id as string] || { total: 0, last30: 0, last90: 0 };
    let access: "active" | "at_risk" | "warning" | "revoked" = "active";
    if (p.status !== "active") access = "revoked";
    else if (p.demo_revoked_at) access = "revoked";
    else if (stat.last90 === 0 && p.approved_at && (p.approved_at as string) < new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString()) {
      access = "warning";
    } else if (stat.last90 === 0 && p.approved_at && (p.approved_at as string) < new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString()) {
      access = "at_risk";
    }
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      referral_code: p.referral_code,
      status: p.status,
      total_referrals: stat.total,
      last_30d: stat.last30,
      last_90d: stat.last90,
      access,
    };
  });

  return json({
    ok: true,
    tierCounts,
    directSubs,
    partnerSubs,
    totalPaid: paidSubs.length,
    league,
  });
});

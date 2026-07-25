// Admin-only overview: subscriber counts by tier, direct vs partner-attributed
// signups, recent-window breakdowns, and a league table of every partner.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0" },
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
  const DAY = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const WEEK = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  const MONTH = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
  const NINETY = new Date(now.getTime() - 90 * 24 * 3600 * 1000).toISOString();

  // Active, non-demo subscribers
  const { data: subs } = await admin
    .from("subscriptions")
    .select("id, email, plan_name, status, is_demo, created_at")
    .eq("status", "active");

  const paidSubs = (subs ?? []).filter((s) => !s.is_demo);
  const tierCounts = { Solo: 0, Business: 0, Professional: 0, Enterprise: 0 } as Record<string, number>;
  for (const s of paidSubs) {
    const p = (s.plan_name as string) || "Solo";
    if (tierCounts[p] === undefined) tierCounts[p] = 0;
    tierCounts[p]++;
  }

  // Partner-attributed vs direct (all-time)
  const { data: refs } = await admin
    .from("referrals")
    .select("subscriber_email, salesperson_id, created_at");
  const attributedEmails = new Set((refs ?? []).map((r) => (r.subscriber_email as string || "").toLowerCase()).filter(Boolean));
  const partnerSubs = paidSubs.filter((s) => attributedEmails.has((s.email as string || "").toLowerCase())).length;
  const directSubs = paidSubs.length - partnerSubs;

  // Attribution in recent windows (by subscription created_at)
  const attributionFor = (sinceIso: string) => {
    const window = paidSubs.filter((s) => (s.created_at as string) >= sinceIso);
    const p = window.filter((s) => attributedEmails.has((s.email as string || "").toLowerCase())).length;
    return { partner: p, direct: window.length - p };
  };
  const attribution24h = attributionFor(DAY);
  const attribution7d = attributionFor(WEEK);
  const attribution30d = attributionFor(MONTH);

  const newSubs = {
    day: paidSubs.filter((s) => (s.created_at as string) >= DAY).length,
    week: paidSubs.filter((s) => (s.created_at as string) >= WEEK).length,
    month: paidSubs.filter((s) => (s.created_at as string) >= MONTH).length,
  };

  // Signups (auth.users) in recent windows
  const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
  const users = usersData?.users ?? [];
  const signups = {
    day: users.filter((u) => Date.parse(u.created_at) >= Date.parse(DAY)).length,
    week: users.filter((u) => Date.parse(u.created_at) >= Date.parse(WEEK)).length,
    month: users.filter((u) => Date.parse(u.created_at) >= Date.parse(MONTH)).length,
  };
  const recentSignups = users
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 8)
    .map((u) => ({ email: u.email ?? "(no email)", created_at: u.created_at }));

  const recentSubs = paidSubs
    .slice()
    .sort((a, b) => Date.parse((b.created_at as string) || "") - Date.parse((a.created_at as string) || ""))
    .slice(0, 8)
    .map((s) => ({
      email: (s.email as string) ?? "(no email)",
      plan_name: (s.plan_name as string) ?? "Solo",
      created_at: s.created_at as string,
    }));

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
    if ((r.created_at as string) >= MONTH) byPartner[spId].last30++;
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
    signups,
    newSubs,
    attribution24h,
    attribution7d,
    attribution30d,
    recentSignups,
    recentSubs,
    league,
    generatedAt: new Date().toISOString(),
  });
});

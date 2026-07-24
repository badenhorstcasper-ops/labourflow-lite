import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Returns first day of the calendar month (YYYY-MM-01) that the calculation targets.
function firstOfMonth(input: string | null): string {
  if (input && /^\d{4}-\d{2}/.test(input)) {
    return `${input.slice(0, 7)}-01`;
  }
  // default = previous full month
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 7) + "-01";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key || !anon) return json({ error: "Server not ready" }, 500);

  // Admins can call from browser; cron calls with a shared CRON_SECRET header.
  const authHeader = req.headers.get("Authorization") || "";
  const cronSecretHeader = req.headers.get("x-cron-secret") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const isCron = cronSecret && cronSecretHeader === cronSecret;
  if (!isCron) {
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Not signed in" }, 401);
    const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await asUser.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return json({ error: "Not signed in" }, 401);
    const { data: isAdmin } = await asUser.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only" }, 403);
  }


  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty ok */ }
  const month = firstOfMonth(typeof body.month === "string" ? body.month : null);
  const monthStart = new Date(`${month}T00:00:00Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

  const admin = createClient(url, key);

  // Load rates map keyed by plan_name (use latest rate whose active_from <= monthStart)
  const { data: rates } = await admin.from("commission_rates").select("plan_name, amount_zar, active_from, active_to");
  const rateFor = (plan: string): number => {
    const candidates = (rates || [])
      .filter(r => r.plan_name === plan)
      .filter(r => new Date(r.active_from) <= monthStart)
      .filter(r => !r.active_to || new Date(r.active_to) >= monthStart)
      .sort((a, b) => new Date(b.active_from).getTime() - new Date(a.active_from).getTime());
    return candidates[0] ? Number(candidates[0].amount_zar) : 0;
  };

  const { data: salespeople } = await admin
    .from("salespersons")
    .select("id, referral_code")
    .in("status", ["active", "inactive"]);

  const results: Array<{ salesperson_id: string; count: number; total: number }> = [];

  for (const sp of salespeople || []) {
    // Find referrals for this salesperson
    const { data: refs } = await admin
      .from("referrals")
      .select("subscriber_user_id, subscriber_email")
      .eq("salesperson_id", sp.id);

    const userIds = (refs || []).map(r => r.subscriber_user_id).filter(Boolean) as string[];
    const emails = (refs || []).map(r => (r.subscriber_email || "").toLowerCase()).filter(Boolean);

    // PayFast transactions that were COMPLETE within the month, matching this salesperson's referred users/emails
    // We also match by transactions carrying tx.referral_code directly.
    const { data: txs } = await admin
      .from("payfast_transactions")
      .select("id, user_id, email, plan_name, amount, updated_at, pf_payment_id, referral_code")
      .eq("status", "complete")
      .gte("updated_at", monthStart.toISOString())
      .lt("updated_at", monthEnd.toISOString());

    const lineItems: Record<string, unknown>[] = [];
    let subs = new Set<string>();
    let total = 0;

    for (const t of txs || []) {
      const matchByCode = t.referral_code && t.referral_code === sp.referral_code;
      const matchByUser = t.user_id && userIds.includes(t.user_id);
      const matchByEmail = t.email && emails.includes(t.email.toLowerCase());
      if (!(matchByCode || matchByUser || matchByEmail)) continue;
      // Only count real recurring debits (amount > 0). Trial signup tx has amount 0 record but real debits carry amount > 0.
      const amt = Number(t.amount || 0);
      if (amt <= 0) continue;
      const rate = rateFor(t.plan_name);
      if (rate <= 0) continue;
      const key = `${t.user_id || t.email}-${t.plan_name}`;
      if (subs.has(key)) continue; // dedupe once per subscriber per month
      subs.add(key);
      total += rate;
      lineItems.push({
        salesperson_id: sp.id,
        subscriber_user_id: t.user_id,
        subscriber_email: t.email,
        plan_name: t.plan_name,
        amount_zar: rate,
        transaction_ref: t.pf_payment_id || t.id,
        collected_date: t.updated_at.slice(0, 10),
      });
    }

    // Cancellations counter (subscriptions cancelled in month, referred by this sp)
    let cancellations = 0;
    if ((refs || []).length) {
      const { count } = await admin
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"])
        .eq("status", "cancelled")
        .gte("updated_at", monthStart.toISOString())
        .lt("updated_at", monthEnd.toISOString());
      cancellations = count || 0;
    }

    // Upsert calculation row (idempotent)
    const { data: calc, error: calcErr } = await admin
      .from("commission_calculations")
      .upsert({
        salesperson_id: sp.id,
        calendar_month: month,
        active_subs_count: subs.size,
        cancellations_count: cancellations,
        gross_commission_zar: total,
      }, { onConflict: "salesperson_id,calendar_month" })
      .select("id")
      .single();
    if (calcErr || !calc) continue;

    // Replace line items for idempotency
    await admin.from("commission_line_items").delete().eq("calculation_id", calc.id);
    if (lineItems.length) {
      await admin.from("commission_line_items").insert(
        lineItems.map(li => ({ ...li, calculation_id: calc.id })),
      );
    }

    results.push({ salesperson_id: sp.id, count: subs.size, total });
  }

  return json({ ok: true, month, processed: results.length, results });
});

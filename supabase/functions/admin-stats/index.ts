import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller and admin role
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const now = new Date();
    const day = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
    const week = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
    const month = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

    const count = (q: any) => q.then((r: any) => r.count ?? 0);
    const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    // listUsers returns total in `total` (v2)
    const totalSignups = (usersList as any)?.total ?? 0;

    const [
      docs, paymentsSuccess, paymentsRejected, bookings, contacts, subs,
      pv1, pv7, pv30,
      recentDocs, recentErrors,
    ] = await Promise.all([
      count(admin.from("generated_documents").select("*", { count: "exact", head: true })),
      count(admin.from("payfast_webhook_log").select("*", { count: "exact", head: true }).eq("outcome", "accepted")),
      count(admin.from("payfast_webhook_log").select("*", { count: "exact", head: true }).eq("outcome", "rejected")),
      count(admin.from("chairperson_bookings").select("*", { count: "exact", head: true })),
      count(admin.from("contact_messages").select("*", { count: "exact", head: true })),
      count(admin.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active")),
      count(admin.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", day)),
      count(admin.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", week)),
      count(admin.from("page_views").select("*", { count: "exact", head: true }).gte("created_at", month)),
      admin.from("generated_documents").select("id, doc_type, created_at").order("created_at", { ascending: false }).limit(10),
      admin.from("error_logs").select("id, short_id, message, route, severity, created_at, email").eq("resolved", false).order("created_at", { ascending: false }).limit(15),
    ]);

    // Recent signups via admin.auth + week/month counts
    const { data: recentUsersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const allUsers = recentUsersData?.users ?? [];
    const recentSignups = allUsers.slice(0, 10).map((u: any) => ({
      id: u.id, email: u.email, created_at: u.created_at,
    }));
    const weekMs = Date.parse(week);
    const monthMs = Date.parse(month);
    const signupsWeek = allUsers.filter((u: any) => Date.parse(u.created_at) >= weekMs).length;
    const signupsMonth = allUsers.filter((u: any) => Date.parse(u.created_at) >= monthMs).length;

    // Top paths in last 7 days
    const { data: pathRows } = await admin
      .from("page_views")
      .select("path")
      .gte("created_at", week)
      .limit(2000);
    const pathCounts: Record<string, number> = {};
    (pathRows ?? []).forEach((r: any) => { pathCounts[r.path] = (pathCounts[r.path] ?? 0) + 1; });
    const topPaths = Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    const OWNER_EMAILS = new Set(["casperbadenhorst77@outlook.com", "badenhorst.casper@gmail.com"]);
    const demoSignups = allUsers.filter((u: any) => OWNER_EMAILS.has((u.email ?? "").toLowerCase())).length;
    const realSignups = Math.max(0, totalSignups - demoSignups);

    return json({
      totals: {
        signups: totalSignups,
        signupsDemo: demoSignups,
        signupsReal: realSignups,
        documents: docs,
        payments: paymentsSuccess,
        paymentsRejected,
        bookings,
        contacts,
        activeSubscriptions: subs,
      },
      signups: { week: signupsWeek, month: signupsMonth },
      pageViews: { day: pv1, week: pv7, month: pv30 },
      topPaths,
      recentSignups,
      recentDocuments: recentDocs.data ?? [],
      recentErrors: recentErrors.data ?? [],
    }, 200);
  } catch (e) {
    console.error("admin-stats error", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0" },
  });
}

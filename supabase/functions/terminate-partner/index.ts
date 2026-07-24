import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Adds one calendar month to a date, capping the day if the target month is shorter.
function addOneCalendarMonth(d: Date): Date {
  const target = new Date(d);
  const day = target.getUTCDate();
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + 1);
  const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, daysInMonth));
  return target;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  const id = typeof body.id === "string" ? body.id : "";
  const mode = typeof body.mode === "string" ? body.mode : ""; // "notice" | "immediate"
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : "";
  if (!id || !["notice", "immediate"].includes(mode)) return json({ error: "Bad request" }, 400);
  if (mode === "immediate" && reason.trim().length < 5) {
    return json({ error: "A reason is required for immediate termination." }, 400);
  }

  const admin = createClient(url, key);
  const { data: sp } = await admin.from("salespersons").select("id, email").eq("id", id).maybeSingle();
  if (!sp) return json({ error: "Not found" }, 404);

  if (mode === "immediate") {
    await admin.from("salespersons").update({
      status: "inactive",
      terminated_reason: reason,
      updated_at: new Date().toISOString(),
    }).eq("id", id);

    // Kill demo access straight away.
    if (sp.email) {
      await admin.from("subscriptions").update({
        status: "inactive",
        updated_at: new Date().toISOString(),
      }).ilike("email", sp.email.toLowerCase()).eq("is_demo", true);
    }
    return json({ ok: true, mode });
  }

  // Notice mode: 1 calendar month.
  const noticeEnd = addOneCalendarMonth(new Date());
  const iso = noticeEnd.toISOString().slice(0, 10);
  await admin.from("salespersons").update({
    status: "notice",
    notice_end_date: iso,
    terminated_reason: reason || null,
    updated_at: new Date().toISOString(),
  }).eq("id", id);

  return json({ ok: true, mode, notice_end_date: iso });
});

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
  const action = typeof body.action === "string" ? body.action : "";
  if (!id || !["approve", "reject", "deactivate", "reactivate"].includes(action)) {
    return json({ error: "Bad request" }, 400);
  }

  const admin = createClient(url, key);
  const { data: sp } = await admin.from("salespersons").select("id, referral_code, status").eq("id", id).maybeSingle();
  if (!sp) return json({ error: "Not found" }, 404);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (action === "approve") {
    update.status = "active";
    update.approved_at = new Date().toISOString();
    update.approved_by = uid;
    if (!sp.referral_code) {
      const { data: code } = await admin.rpc("generate_referral_code");
      update.referral_code = code;
    }
  } else if (action === "reject") {
    update.status = "rejected";
  } else if (action === "deactivate") {
    update.status = "inactive";
  } else if (action === "reactivate") {
    update.status = "active";
  }

  const { error } = await admin.from("salespersons").update(update).eq("id", id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, referral_code: update.referral_code ?? sp.referral_code });
});

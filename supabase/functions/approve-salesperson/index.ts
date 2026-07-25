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
  const { data: sp } = await admin
    .from("salespersons")
    .select("id, email, full_name, referral_code, status")
    .eq("id", id)
    .maybeSingle();
  if (!sp) return json({ error: "Not found" }, 404);

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let becameActive = false;

  if (action === "approve") {
    update.status = "active";
    update.approved_at = new Date().toISOString();
    update.approved_by = uid;
    if (!sp.referral_code) {
      const { data: code } = await admin.rpc("generate_referral_code");
      update.referral_code = code;
    }
    becameActive = true;
  } else if (action === "reject") {
    update.status = "rejected";
  } else if (action === "deactivate") {
    update.status = "inactive";
  } else if (action === "reactivate") {
    update.status = "active";
    update.demo_revoked_at = null;
    becameActive = true;
  }

  const { error } = await admin.from("salespersons").update(update).eq("id", id);
  if (error) return json({ error: error.message }, 500);

  if (becameActive && sp.email) {
    const email = sp.email.toLowerCase();
    const { data: existing } = await admin
      .from("subscriptions")
      .select("id, is_demo")
      .ilike("email", email)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!existing) {
      await admin.from("subscriptions").insert({
        email,
        plan_name: "Solo",
        status: "active",
        is_demo: true,
        device_limit: 1,
      });
    } else if (existing.is_demo) {
      await admin
        .from("subscriptions")
        .update({ status: "active", plan_name: "Solo", device_limit: 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
  }

  if ((action === "deactivate" || action === "reject") && sp.email) {
    await admin
      .from("subscriptions")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .ilike("email", sp.email.toLowerCase())
      .eq("is_demo", true);
  }

  const finalCode = (update.referral_code as string) ?? sp.referral_code;
  return json({
    ok: true,
    referral_code: finalCode,
    salesperson: {
      full_name: sp.full_name,
      email: sp.email,
      referral_code: finalCode,
    },
  });
});

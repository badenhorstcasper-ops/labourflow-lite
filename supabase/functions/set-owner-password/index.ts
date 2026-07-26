import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// One-time owner maintenance task: sets the owner's account password.
// Guarded by the private CRON_SECRET. Deleted right after it is used.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = req.headers.get("x-admin-secret") || "";
  if (!secret || secret !== Deno.env.get("OWNER_TASK_SECRET")) {
    return new Response(JSON.stringify({ error: "not_authorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { emails?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch (_) {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const emails = Array.isArray(body.emails) ? body.emails.filter((e) => typeof e === "string") as string[] : [];
  const password = typeof body.password === "string" ? body.password : "";
  if (!emails.length || password.length < 8) {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results: Record<string, string> = {};
  for (const email of emails) {
    const target = email.trim().toLowerCase();
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === target);
    if (existing) {
      const { error } = await admin.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
      });
      results[target] = error ? `error: ${error.message}` : "password_updated";
      if (!error) {
        await admin.from("user_roles").upsert(
          { user_id: existing.id, role: "admin" },
          { onConflict: "user_id,role" },
        );
      }
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: target,
        password,
        email_confirm: true,
      });
      results[target] = error ? `error: ${error.message}` : "account_created";
      if (created?.user?.id) {
        await admin.from("user_roles").upsert(
          { user_id: created.user.id, role: "admin" },
          { onConflict: "user_id,role" },
        );
      }
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

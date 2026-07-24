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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: "Subscription linking is not ready." }, 500);
  }

  const authedClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await authedClient.auth.getClaims(token);
  if (error || !data?.claims?.sub) return json({ error: "Unauthorized" }, 401);

  const userId = data.claims.sub;
  const email = typeof data.claims.email === "string" ? data.claims.email.trim().toLowerCase() : "";
  if (!email) return json({ linked: false });

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: existingUserSub } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existingUserSub?.id) return json({ linked: true });

  const { data: completedTx } = await admin
    .from("payfast_transactions")
    .select("id")
    .is("user_id", null)
    .ilike("email", email)
    .eq("status", "complete")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (completedTx?.id) {
    await admin
      .from("payfast_transactions")
      .update({ user_id: userId, updated_at: new Date().toISOString() })
      .eq("id", completedTx.id);
  }

  const { data: pendingSub } = await admin
    .from("subscriptions")
    .select("id")
    .is("user_id", null)
    .ilike("email", email)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendingSub?.id) return json({ linked: false });

  await admin
    .from("subscriptions")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", pendingSub.id);

  return json({ linked: true });
});
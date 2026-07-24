import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(v: unknown, max = 200): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ error: "Server not ready" }, 500);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid submission" }, 400); }

  const full_name = clean(body.full_name, 200);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);
  const id_number = clean(body.id_number, 20);
  const banking = (body.banking_details && typeof body.banking_details === "object") ? body.banking_details : null;

  if (!full_name || !email || !phone || !id_number || !banking) {
    return json({ error: "Please complete every field before submitting." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  const admin = createClient(url, key);

  // Simple rate limit: max 5 pending applications from same email within 24h.
  const { count } = await admin
    .from("salespersons")
    .select("*", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  if ((count ?? 0) >= 3) {
    return json({ error: "You've already applied recently — we'll email you soon." }, 429);
  }

  const { error } = await admin.from("salespersons").insert({
    full_name,
    email,
    phone,
    id_number,
    banking_details: banking,
    status: "pending_approval",
  });
  if (error) {
    console.error("insert salesperson failed", error);
    return json({ error: "Could not save your application. Please try again." }, 500);
  }

  // Notification log for admin (best-effort).
  await admin.from("notification_log").insert([
    { recipient_email: "casperbadenhorst77@outlook.com", type: "partner_application", status: "queued" },
    { recipient_email: "badenhorst.casper@gmail.com", type: "partner_application", status: "queued" },
  ]);

  return json({ ok: true });
});

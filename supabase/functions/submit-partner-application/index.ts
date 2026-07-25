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

function normalizeName(v: string): string {
  return v.trim().replace(/\s+/g, " ").toLowerCase();
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
  const banking = (body.banking_details && typeof body.banking_details === "object") ? body.banking_details as Record<string, unknown> : null;
  const agreement = (body.agreement && typeof body.agreement === "object") ? body.agreement as Record<string, unknown> : null;

  if (!full_name || !email || !phone || !id_number || !banking) {
    return json({ error: "Please complete every field before submitting." }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }
  if (!agreement) {
    return json({ error: "You must accept the Partner Agreement to apply." }, 400);
  }

  const agreement_version = clean(agreement.version, 20);
  const accepted_full_name = clean(agreement.accepted_full_name, 200);
  const flags = (agreement.clause_flags && typeof agreement.clause_flags === "object")
    ? agreement.clause_flags as Record<string, unknown>
    : {};
  const user_agent = clean(agreement.user_agent, 500);

  if (!agreement_version || !accepted_full_name) {
    return json({ error: "Missing signature on the agreement." }, 400);
  }
  if (!flags.agreement || !flags.not_employment || !flags.tax_and_ads) {
    return json({ error: "All three acceptance boxes must be ticked." }, 400);
  }
  if (normalizeName(accepted_full_name) !== normalizeName(full_name)) {
    return json({ error: "The signature name must match your full name." }, 400);
  }

  const admin = createClient(url, key);

  const { count } = await admin
    .from("salespersons")
    .select("*", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  if ((count ?? 0) >= 3) {
    return json({ error: "You've already applied recently — we'll email you soon." }, 429);
  }

  let { data: sp, error } = await admin.from("salespersons").insert({
    full_name,
    email,
    phone,
    id_number,
    banking_details: banking,
    status: "pending_approval",
  }).select("id").maybeSingle();

  if (error && (error as { code?: string }).code === "23505") {
    // Existing application under this email — reuse it so the flow can continue.
    const { data: existing, error: exErr } = await admin
      .from("salespersons")
      .select("id, status")
      .ilike("email", email)
      .maybeSingle();
    if (exErr || !existing) {
      console.error("lookup existing salesperson failed", exErr);
      return json({ error: "An application already exists for this email. Please contact info@inreco.co.za." }, 409);
    }
    if (existing.status && existing.status !== "pending_approval") {
      return json({ error: "An application already exists for this email. Please contact info@inreco.co.za." }, 409);
    }
    await admin.from("salespersons").update({
      full_name,
      phone,
      id_number,
      banking_details: banking,
    }).eq("id", existing.id);
    sp = { id: existing.id } as { id: string };
    error = null;
  }

  if (error || !sp) {
    console.error("insert salesperson failed", error);
    return json({ error: "Could not save your application. Please try again." }, 500);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip")
    ?? null;

  await admin.from("partner_agreements").insert({
    salesperson_id: sp.id,
    applicant_email: email,
    agreement_version,
    accepted_full_name,
    clause_flags: flags,
    accepted_ip: ip,
    accepted_user_agent: user_agent || null,
  });

  await admin.from("notification_log").insert([
    { recipient_email: "info@inreco.co.za", type: "partner_application", status: "queued" },
  ]);

  // Return an application summary so the browser can open the applicant's
  // email client with a fully pre-filled message to info@inreco.co.za.
  return json({
    ok: true,
    application: {
      id: sp.id,
      full_name,
      email,
      phone,
      id_number,
      banking,
      agreement_version,
      signed_name: accepted_full_name,
      timestamp: new Date().toISOString(),
    },
  });
});

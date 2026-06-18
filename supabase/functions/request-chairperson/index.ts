// Records a chairperson booking request from an authenticated user.
// Inserts into public.chairperson_bookings (visible to iNRECO via the backend)
// and logs the request for follow-up. Notification email to info@inreco.co.za
// can be wired in once Lovable Emails is fully provisioned for this project.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TARGET_EMAIL = "info@inreco.co.za";

function bad(status: number, error: string, extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ error, ...(extra || {}) }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "method_not_allowed");

  const auth = req.headers.get("Authorization") || "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!token) return bad(401, "not_authenticated");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return bad(401, "not_authenticated");
  const user = userData.user;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad(400, "invalid_json");
  }

  const employerName = String(body.employer_name || "").trim();
  const contactEmail = String(body.contact_email || "").trim().toLowerCase();
  const contactPhone = String(body.contact_phone || "").trim();
  const employeeName = String(body.employee_name || "").trim();
  const preferredPlatform = String(body.preferred_platform || "").trim();
  const notes = body.notes ? String(body.notes).trim().slice(0, 2000) : null;
  const documentId = body.document_id ? String(body.document_id) : null;
  const slots = Array.isArray(body.preferred_slots)
    ? body.preferred_slots.map((s) => String(s)).filter(Boolean)
    : [];

  const errors: Record<string, string> = {};
  if (employerName.length < 1 || employerName.length > 200) errors.employer_name = "Employer/contact name required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactEmail.length > 254)
    errors.contact_email = "Valid email required.";
  if (contactPhone.length < 5 || contactPhone.length > 40) errors.contact_phone = "Phone number required.";
  if (employeeName.length < 1 || employeeName.length > 200) errors.employee_name = "Employee name required.";
  if (!["teams", "meet", "any"].includes(preferredPlatform)) errors.preferred_platform = "Pick Teams, Meet or Any.";
  if (slots.length !== 3) errors.preferred_slots = "Please provide exactly 3 preferred date-times.";
  const now = Date.now();
  const parsedSlots: string[] = [];
  for (const s of slots) {
    const d = new Date(s);
    if (isNaN(d.getTime()) || d.getTime() < now) {
      errors.preferred_slots = "Preferred date-times must be valid and in the future.";
      break;
    }
    parsedSlots.push(d.toISOString());
  }
  if (new Set(parsedSlots).size !== parsedSlots.length) {
    errors.preferred_slots = "Preferred date-times must be distinct.";
  }
  if (Object.keys(errors).length > 0) return bad(400, "validation", { errors });

  const admin = createClient(supabaseUrl, serviceKey);

  // Resolve account_owner_id consistent with the rest of the app.
  let accountOwnerId = user.id;
  try {
    const { data: ownerRpc } = await admin.rpc("current_account_owner");
    if (typeof ownerRpc === "string") accountOwnerId = ownerRpc;
  } catch (_e) {
    // ignore — fall back to user.id
  }
  // Note: current_account_owner reads auth.uid(); when called from service role
  // it returns null. So we instead derive it from team_members directly.
  try {
    const { data: tm } = await admin
      .from("team_members")
      .select("owner_user_id")
      .eq("member_user_id", user.id)
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (tm?.owner_user_id) accountOwnerId = tm.owner_user_id as string;
    else accountOwnerId = user.id;
  } catch (_e) {
    accountOwnerId = user.id;
  }

  // Optionally fetch the linked document for context (share_token).
  let shareUrl: string | null = null;
  if (documentId) {
    const { data: doc } = await admin
      .from("generated_documents")
      .select("share_token")
      .eq("id", documentId)
      .maybeSingle();
    if (doc?.share_token) {
      const origin = req.headers.get("origin") || "https://app.inreco.co.za";
      shareUrl = `${origin}/d/${doc.share_token}`;
    }
  }

  const { data: inserted, error: insErr } = await admin
    .from("chairperson_bookings")
    .insert({
      user_id: user.id,
      account_owner_id: accountOwnerId,
      document_id: documentId,
      employer_name: employerName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      employee_name: employeeName,
      preferred_platform: preferredPlatform,
      preferred_slots: parsedSlots,
      notes,
    })
    .select("id")
    .single();

  if (insErr) {
    console.error("chairperson booking insert failed", insErr);
    return bad(500, "server_error");
  }

  // Log so iNRECO can find requests in function logs even if email isn't wired.
  console.log("chairperson_booking_request", {
    target: TARGET_EMAIL,
    booking_id: inserted.id,
    user_id: user.id,
    employer_name: employerName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    employee_name: employeeName,
    preferred_platform: preferredPlatform,
    preferred_slots: parsedSlots,
    share_url: shareUrl,
    notes,
  });

  return new Response(JSON.stringify({ ok: true, booking_id: inserted.id }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

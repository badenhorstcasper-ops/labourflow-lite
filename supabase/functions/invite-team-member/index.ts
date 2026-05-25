// Invite a team member to the caller's account.
// - Auth: caller must be a signed-in user (owner).
// - Enforces seat limits based on public.subscriptions.plan_name.
// - Sends invite via supabase.auth.admin.inviteUserByEmail.
// - Inserts a pending team_members row.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SEAT_LIMITS: Record<string, number> = {
  Solo: 1,
  Business: 5,
  Professional: 10,
  Enterprise: 15,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

    // Identify caller
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json(401, { error: "Unauthorized" });
    const ownerId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
    if (!emailOk) return json(400, { error: "Invalid email address" });

    // Service-role client for privileged work
    const admin = createClient(supabaseUrl, serviceKey);

    // Look up owner's plan + seat usage
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan_name, status")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const planName = sub?.plan_name || "Solo";
    const seatLimit = SEAT_LIMITS[planName] ?? 1;

    const { count: usedCount } = await admin
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("owner_user_id", ownerId);

    // Owner consumes 1 seat
    const used = (usedCount ?? 0) + 1;
    if (used >= seatLimit) {
      return json(403, {
        error: `No seats remaining on the ${planName} plan (${used}/${seatLimit}).`,
      });
    }

    // Prevent inviting yourself
    if (userData.user.email && email === userData.user.email.toLowerCase()) {
      return json(400, { error: "You cannot invite yourself." });
    }

    // Duplicate guard
    const { data: existing } = await admin
      .from("team_members")
      .select("id, status")
      .eq("owner_user_id", ownerId)
      .ilike("member_email", email)
      .maybeSingle();
    if (existing) {
      return json(409, { error: `That email is already ${existing.status}.` });
    }

    // Send the invite. If the user already exists, link them immediately.
    const redirectTo = (req.headers.get("origin") || "") + "/";
    let memberUserId: string | null = null;
    let status: "pending" | "active" = "pending";

    const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(
      email,
      { redirectTo, data: { invited_by: ownerId } },
    );

    if (inviteErr) {
      // If user already exists, fall back to linking
      const msg = String(inviteErr.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        const { data: list } = await admin.auth.admin.listUsers();
        const existingUser = list?.users?.find(
          (u) => (u.email || "").toLowerCase() === email,
        );
        if (existingUser) {
          memberUserId = existingUser.id;
          status = "active";
        } else {
          return json(400, { error: inviteErr.message });
        }
      } else {
        return json(400, { error: inviteErr.message });
      }
    } else if (inviteData?.user) {
      memberUserId = inviteData.user.id;
    }

    const { error: insertErr } = await admin.from("team_members").insert({
      owner_user_id: ownerId,
      member_email: email,
      member_user_id: memberUserId,
      status,
      joined_at: status === "active" ? new Date().toISOString() : null,
    });
    if (insertErr) return json(500, { error: insertErr.message });

    return json(200, { ok: true, status, seats_used: used, seat_limit: seatLimit });
  } catch (e) {
    console.error("invite-team-member error", e);
    return json(500, { error: "Internal error" });
  }
});

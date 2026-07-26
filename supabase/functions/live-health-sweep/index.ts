import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sweep-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * Every behind-the-scenes service, with a plain-language label the owner can
 * understand, and the answer we expect back when the service is alive.
 *
 * A service is HEALTHY when it answers with any of `okCodes`. Those are the
 * "you didn't give me what I need / you're not signed in" answers, which prove
 * the service is running and thinking. 404 (missing) or 5xx (crashed) = down.
 */
type Check = { name: string; label: string; okCodes: number[]; body?: unknown; skipAuthProbe?: boolean };

const CHECKS: Check[] = [
  { name: "cara-chat", label: "CARA answers questions", okCodes: [400] },
  { name: "cara-transcribe", label: "CARA voice input", okCodes: [400] },
  { name: "payfast-checkout", label: "Start a subscription (PayFast)", okCodes: [400] },
  { name: "payfast-webhook", label: "Receive payment confirmations", okCodes: [200] },
  { name: "payfast-cancel", label: "Cancel a subscription", okCodes: [401] },
  { name: "link-subscription", label: "Link a payment to an account", okCodes: [401] },
  { name: "admin-stats", label: "Admin dashboard figures", okCodes: [401] },
  { name: "owner-overview", label: "Owner overview figures", okCodes: [401] },
  { name: "invite-team-member", label: "Invite a team member", okCodes: [401] },
  { name: "submit-contact", label: "Contact form", okCodes: [400] },
  { name: "submit-partner-application", label: "Partner sign-up", okCodes: [400] },
  { name: "approve-salesperson", label: "Approve a partner", okCodes: [401] },
  { name: "terminate-partner", label: "Remove a partner", okCodes: [401] },
  { name: "revoke-inactive-partners", label: "Auto-remove inactive partners", okCodes: [401, 403] },
  { name: "run-commission-month", label: "Monthly commission run", okCodes: [401] },
  { name: "request-chairperson", label: "Book a chairperson", okCodes: [401] },
  { name: "get-shared-document", label: "Open a shared document link", okCodes: [400] },
  { name: "resolve-error", label: "Clear an error report", okCodes: [401] },
  { name: "run-security-scan", label: "Security scan", okCodes: [401] },
  { name: "process-email-queue", label: "Outgoing email queue", okCodes: [401] },
];

const PAGES: { path: string; label: string }[] = [
  { path: "/", label: "Landing page" },
  { path: "/pricing", label: "Pricing page" },
  { path: "/auth", label: "Sign in / sign up page" },
  { path: "/partner/apply", label: "Partner sign-up page" },
  { path: "/terms", label: "Terms page" },
  { path: "/privacy", label: "Privacy page" },
  { path: "/disclaimer", label: "Disclaimer page" },
];

const LIVE_SITE = "https://app.inreco.co.za";

async function probeService(baseUrl: string, anonKey: string, check: Check) {
  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl}/functions/v1/${check.name}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
        Origin: LIVE_SITE,
      },
      body: JSON.stringify(check.body ?? {}),
      signal: AbortSignal.timeout(20000),
    });
    const ms = Date.now() - started;
    const text = (await res.text()).slice(0, 300);
    const healthy = check.okCodes.includes(res.status) || (res.status >= 200 && res.status < 500 && res.status !== 404);
    return {
      status: healthy ? "up" : "down",
      http_status: res.status,
      response_ms: ms,
      detail: healthy ? null : `Answered ${res.status}: ${text}`,
    };
  } catch (error) {
    return {
      status: "down",
      http_status: null,
      response_ms: Date.now() - started,
      detail: `No answer: ${String(error).slice(0, 200)}`,
    };
  }
}

async function probePage(path: string) {
  const started = Date.now();
  try {
    const res = await fetch(`${LIVE_SITE}${path}`, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    });
    await res.text();
    const ms = Date.now() - started;
    return {
      status: res.ok ? "up" : "down",
      http_status: res.status,
      response_ms: ms,
      detail: res.ok ? null : `Page answered ${res.status}`,
    };
  } catch (error) {
    return {
      status: "down",
      http_status: null,
      response_ms: Date.now() - started,
      detail: `Page did not load: ${String(error).slice(0, 200)}`,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "not_configured" }, 500);

  const admin = createClient(supabaseUrl, serviceKey);

  // Two ways in: an admin pressing the button, or the scheduled nightly run.
  const sweepKey = req.headers.get("x-sweep-key");
  const expectedKey = Deno.env.get("HEALTH_SWEEP_KEY") || "";
  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  let triggeredBy = "scheduled";

  const scheduled = (expectedKey && sweepKey && sweepKey === expectedKey) || (bearer && bearer === serviceKey);

  if (!scheduled) {
    if (!bearer) return json({ error: "not_authenticated" }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "not_authenticated" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "forbidden" }, 403);
    triggeredBy = "manual";
  }


  const runId = crypto.randomUUID();
  const checkedAt = new Date().toISOString();

  const serviceResults = await Promise.all(
    CHECKS.map(async (check) => {
      const outcome = await probeService(supabaseUrl, anonKey, check);
      return {
        service_name: check.name,
        label: check.label,
        run_id: runId,
        triggered_by: triggeredBy,
        checked_at: checkedAt,
        ...outcome,
      };
    }),
  );

  const pageResults = await Promise.all(
    PAGES.map(async (page) => {
      const outcome = await probePage(page.path);
      return {
        service_name: `page:${page.path}`,
        label: page.label,
        run_id: runId,
        triggered_by: triggeredBy,
        checked_at: checkedAt,
        ...outcome,
      };
    }),
  );

  const rows = [...serviceResults, ...pageResults];
  const { error: insertError } = await admin.from("service_health_checks").insert(rows);
  if (insertError) console.error("Could not save health results", insertError);

  // Keep the table small: drop anything older than 30 days.
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  await admin.from("service_health_checks").delete().lt("checked_at", cutoff);

  const down = rows.filter((r) => r.status === "down");
  return json({
    run_id: runId,
    checked_at: checkedAt,
    total: rows.length,
    healthy: rows.length - down.length,
    down: down.length,
    results: rows,
  });
});

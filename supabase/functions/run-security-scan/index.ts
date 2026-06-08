// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Severity = "critical" | "high" | "medium" | "low";
type Finding = {
  rule_id: string;
  severity: Severity;
  title: string;
  description: string;
  affected_object?: string | null;
  remediation?: string | null;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function runChecks(): Promise<Finding[]> {
  const findings: Finding[] = [];
  try {
    const { data, error } = await admin.rpc("_sec_scan_collect" as any);
    if (error) throw error;
    const rows = (data ?? []) as { kind: string; obj: string; detail: string }[];
    for (const r of rows) {
      switch (r.kind) {
        case "rls_disabled":
          findings.push({
            rule_id: `rls-disabled:${r.obj}`,
            severity: "critical",
            title: `Row-Level Security is OFF on ${r.obj}`,
            description: `The table public.${r.obj} has RLS disabled, so every row is readable through the Data API.`,
            affected_object: `public.${r.obj}`,
            remediation: `ALTER TABLE public.${r.obj} ENABLE ROW LEVEL SECURITY; and add appropriate policies.`,
          });
          break;
        case "no_policies":
          findings.push({
            rule_id: `no-policies:${r.obj}`,
            severity: "high",
            title: `${r.obj} has RLS but no policies`,
            description: `Table public.${r.obj} has RLS enabled but no policies — all access is blocked, which usually means a missing policy was forgotten.`,
            affected_object: `public.${r.obj}`,
            remediation: `Add CREATE POLICY statements appropriate to who should read/write this table.`,
          });
          break;
        case "permissive_policy":
          findings.push({
            rule_id: `permissive-policy:${r.obj}`,
            severity: "high",
            title: `Permissive policy on ${r.obj}`,
            description: `A policy on public.${r.obj} uses USING (true) or WITH CHECK (true): ${r.detail}. This grants unrestricted access to anyone the policy applies to.`,
            affected_object: `public.${r.obj}`,
            remediation: `Tighten the policy to scope by auth.uid() or public.has_role(auth.uid(),'admin').`,
          });
          break;
        case "anon_grant":
          findings.push({
            rule_id: `anon-grant:${r.obj}`,
            severity: "medium",
            title: `Anonymous role has access to ${r.obj}`,
            description: `The 'anon' role has ${r.detail} on public.${r.obj}. Confirm this table is meant to be readable by unauthenticated visitors.`,
            affected_object: `public.${r.obj}`,
            remediation: `If not intended: REVOKE ${r.detail} ON public.${r.obj} FROM anon;`,
          });
          break;
        case "missing_grant":
          findings.push({
            rule_id: `missing-grant:${r.obj}`,
            severity: "high",
            title: `${r.obj} has no GRANTs — app cannot reach it`,
            description: `Table public.${r.obj} has RLS configured but no role has been granted access via the Data API.`,
            affected_object: `public.${r.obj}`,
            remediation: `GRANT SELECT, INSERT, UPDATE, DELETE ON public.${r.obj} TO authenticated;`,
          });
          break;
        case "definer_no_search_path":
          findings.push({
            rule_id: `definer-search-path:${r.obj}`,
            severity: "medium",
            title: `SECURITY DEFINER function ${r.obj} has no fixed search_path`,
            description: `Function public.${r.obj} runs as its owner but does not pin search_path, which can be exploited.`,
            affected_object: `public.${r.obj}`,
            remediation: `ALTER FUNCTION public.${r.obj} SET search_path = public;`,
          });
          break;
        case "public_bucket":
          findings.push({
            rule_id: `public-bucket:${r.obj}`,
            severity: "low",
            title: `Storage bucket ${r.obj} is public`,
            description: `Bucket "${r.obj}" is marked public. Anyone with a file URL can download it.`,
            affected_object: `storage:${r.obj}`,
            remediation: `If only logos/marketing assets live here, this is fine. Otherwise switch to private + signed URLs.`,
          });
          break;
      }
    }
  } catch (e) {
    findings.push({
      rule_id: "scan-helper-missing",
      severity: "low",
      title: "Scan helper function not installed",
      description: `Internal: ${(e as Error).message}`,
      affected_object: "public._sec_scan_collect",
      remediation: "Re-run the security migration.",
    });
  }

  return findings;
}

function tally(findings: Finding[]) {
  const c = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) c[f.severity]++;
  return c;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let triggered_by: string | null = null;
    let triggered_by_email: string | null = null;
    let trigger_type = "manual";

    const authHeader = req.headers.get("Authorization") ?? "";
    const cronHeader = req.headers.get("x-cron-secret") ?? "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();

    const isService = bearer && bearer === SERVICE_ROLE;
    const isCron = cronHeader && CRON_SECRET && cronHeader === CRON_SECRET;

    if (isService || isCron) {
      trigger_type = "scheduled";
    } else {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      });
      const { data: u, error: uerr } = await userClient.auth.getUser();
      if (uerr || !u.user) {
        return new Response(JSON.stringify({ error: "not_authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: role } = await admin
        .from("user_roles").select("role")
        .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      if (!role) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      triggered_by = u.user.id;
      triggered_by_email = u.user.email ?? null;
    }

    const { data: scan, error: scanErr } = await admin
      .from("security_scans")
      .insert({ triggered_by, triggered_by_email, trigger_type, status: "running" })
      .select().single();
    if (scanErr) throw scanErr;

    const findings = await runChecks();
    const counts = tally(findings);

    if (findings.length > 0) {
      const rows = findings.map((f) => ({ ...f, scan_id: scan.id }));
      const { error: fErr } = await admin.from("security_findings").insert(rows);
      if (fErr) throw fErr;
    }

    await admin.from("security_scans").update({
      finished_at: new Date().toISOString(),
      status: "complete",
      critical_count: counts.critical,
      high_count: counts.high,
      medium_count: counts.medium,
      low_count: counts.low,
      total_count: findings.length,
    }).eq("id", scan.id);

    return new Response(JSON.stringify({ scan_id: scan.id, counts, total: findings.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

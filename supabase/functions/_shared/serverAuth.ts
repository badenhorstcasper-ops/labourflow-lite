// Server-to-server caller check for scheduled jobs and internal calls.
// Accepts: the exact service-role key, a verified service-role token, or the
// CRON_SECRET shared header (only when that secret is actually configured).
import { createClient } from "npm:@supabase/supabase-js@2";

function claimsRole(token: string): string | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "="));
    return (JSON.parse(json) as { role?: string }).role ?? null;
  } catch {
    return null;
  }
}

export async function isServiceCaller(req: Request): Promise<boolean> {
  const cronSecret = (Deno.env.get("CRON_SECRET") || "").trim();
  const provided = (req.headers.get("x-cron-secret") || "").trim();
  if (cronSecret && provided && provided === cronSecret) return true;

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const url = Deno.env.get("SUPABASE_URL") || "";
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return false;
  if (serviceKey && bearer === serviceKey) return true;

  // A different service-role token (e.g. stored in vault): prove it by using
  // an admin-only operation, which fails for anything but service role.
  if (claimsRole(bearer) !== "service_role" || !url) return false;
  try {
    const probe = createClient(url, bearer, { auth: { persistSession: false } });
    const { error } = await probe.auth.admin.listUsers({ page: 1, perPage: 1 });
    return !error;
  } catch {
    return false;
  }
}

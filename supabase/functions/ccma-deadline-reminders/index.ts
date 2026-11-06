// Daily (07:00 SAST via pg_cron): CCMA deadline reminders.
// 1. Runs public.flag_ccma_deadline_reminders() — creates today's in-app reminder
//    rows (idempotent; the 06:30 SQL cron normally did this already).
// 2. Emails every pending reminder through the existing send-transactional-email
//    queue (Lovable Emails, notify.inreco.co.za), with a per-reminder idempotency
//    key so a re-run never double-sends. Suppressed/unsubscribed addresses are
//    skipped by send-transactional-email itself.
// Safe to call more than once a day. Guidance only — not legal advice.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  DEADLINE_RULES,
  DISPUTE_TYPE_LABELS,
  type DisputeType,
  formatYmd,
  computeDeadline,
} from "../_shared/ccmaDeadlines.ts";

const MAX_ATTEMPTS = 3;
const BATCH = 200;
const RETRY_WINDOW_MS = 3 * 24 * 3600 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server not ready" }, 500);

  // Same optional shared-secret pattern as revoke-inactive-partners. When the
  // CRON_SECRET edge secret is set, the caller must send it (pg_cron reads it
  // from vault 'CRON_SECRET') or use the service-role key.
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const provided = req.headers.get("x-cron-secret");
    const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (provided !== cronSecret && bearer !== serviceKey) return json({ error: "Forbidden" }, 403);
  }

  const admin = createClient(url, serviceKey);

  const { data: flagged, error: flagErr } = await admin.rpc("flag_ccma_deadline_reminders");
  if (flagErr) return json({ error: `flag failed: ${flagErr.message}` }, 500);

  const since = new Date(Date.now() - RETRY_WINDOW_MS).toISOString();
  const { data: rows, error } = await admin
    .from("ccma_deadline_reminders")
    .select("id, matter_id, recipient_user_id, due_date, stage, days_left, email_attempts, email_status")
    .in("email_status", ["pending", "failed"])
    .lt("email_attempts", MAX_ATTEMPTS)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(BATCH);
  if (error) return json({ error: error.message }, 500);

  const emailCache = new Map<string, string | null>();
  let sent = 0, skipped = 0, failed = 0;

  for (const r of rows ?? []) {
    const { data: m } = await admin
      .from("ccma_matters")
      .select("id, title, employee_name, case_number, dispute_type, trigger_date, custom_due_date, due_date, status, email_reminders")
      .eq("id", r.matter_id)
      .maybeSingle();

    // Matter closed, switched off email, or the date moved since flagging: don't email.
    if (!m || m.status !== "open" || !m.email_reminders || m.due_date !== r.due_date) {
      await admin.from("ccma_deadline_reminders").update({ email_status: "skipped" }).eq("id", r.id);
      skipped++;
      continue;
    }

    let email = emailCache.get(r.recipient_user_id);
    if (email === undefined) {
      const { data: u } = await admin.auth.admin.getUserById(r.recipient_user_id);
      email = u?.user?.email ?? null;
      emailCache.set(r.recipient_user_id, email);
    }
    if (!email) {
      await admin.from("ccma_deadline_reminders")
        .update({ email_status: "skipped", email_error: "no email on account" }).eq("id", r.id);
      skipped++;
      continue;
    }

    const type = m.dispute_type as DisputeType;
    const rule = type === "custom" ? null : DEADLINE_RULES[type];
    let mayExtendTo: string | null = null;
    try {
      mayExtendTo = computeDeadline(type, m.trigger_date, m.custom_due_date).mayExtendTo;
    } catch { /* custom without date etc. — ignore */ }

    const { error: sendErr } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "ccma-deadline-reminder",
        recipientEmail: email,
        idempotencyKey: `ccma-reminder-${r.id}`,
        templateData: {
          title: m.title,
          employeeName: m.employee_name ?? undefined,
          caseNumber: m.case_number ?? undefined,
          typeLabel: DISPUTE_TYPE_LABELS[type] ?? "Deadline",
          dueLabel: rule?.dueLabel ?? "Your deadline",
          source: rule?.source ?? undefined,
          dueDateText: formatYmd(m.due_date),
          mayExtendToText: mayExtendTo ? formatYmd(mayExtendTo) : undefined,
          daysLeft: r.days_left,
          stage: r.stage,
        },
      },
    });

    if (sendErr) {
      failed++;
      await admin.from("ccma_deadline_reminders").update({
        email_status: "failed",
        email_attempts: (r.email_attempts ?? 0) + 1,
        email_error: String(sendErr.message ?? sendErr).slice(0, 300),
      }).eq("id", r.id);
    } else {
      sent++;
      await admin.from("ccma_deadline_reminders").update({
        email_status: "sent",
        email_attempts: (r.email_attempts ?? 0) + 1,
        emailed_at: new Date().toISOString(),
        email_error: null,
      }).eq("id", r.id);
    }
  }

  return json({ flagged: flagged ?? 0, checked: rows?.length ?? 0, sent, skipped, failed });
});

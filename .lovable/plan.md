
# Security findings dashboard

## Where it lives
On the existing admin page `/account-app/health` (already admin-only). I'll convert that page to tabs:

- **Errors** (current list)
- **User reports** (current list)
- **Security** (new)
- **Backend status** (current indicators, moved into its own tab)

That keeps everything you already use in one place — no new menu items to learn.

## What the Security tab shows

1. **Latest scan summary card**
   - Big badges: `Critical 2 · High 1 · Medium 0 · Low 3` (color-coded red / orange / yellow / grey)
   - "Last scanned: 8 Jun 2026 14:02" + **Re-run scan now** button (admin only)
   - Overall status pill: ✅ All clear / ⚠️ Action needed

2. **Findings list** (current scan)
   Each row:
   - Severity chip (color-coded)
   - Title + plain-English description
   - Affected table/function
   - Two buttons:
     - **Copy for Lovable** → copies a pre-written fix prompt to clipboard, same pattern as the existing "Copy for Lovable" on errors. You paste into chat → I fix it.
     - **Mark as ignored** (with reason) — for false positives.

3. **Scan history** (collapsible)
   - Table: date · critical · high · medium · low · who triggered
   - Click a row to see that snapshot's findings (read-only).
   - Sparkline showing finding count over last 30 days so you can see if things are trending better or worse.

## How scans run

- **Manual**: "Re-run scan now" button calls a new edge function `run-security-scan` which executes the same checks the Lovable scanner uses (RLS coverage, GRANT correctness, policy permissiveness, public-table exposure, function search_path, exposed sensitive columns) and writes a snapshot.
- **Automatic daily**: pg_cron job runs the same edge function every morning at 06:00 SAST. If new critical/high findings appear, a row is added to `error_logs` so it shows up in your Errors tab too — no separate inbox to check.

## Data model (new tables, admin-only)

- `security_scans` — one row per scan run: `triggered_by`, `trigger_type` (manual/scheduled), `started_at`, `finished_at`, `critical_count`, `high_count`, `medium_count`, `low_count`, `status`.
- `security_findings` — one row per finding in a scan: `scan_id`, `rule_id`, `severity`, `title`, `description`, `affected_object`, `remediation`, `state` (open/ignored/fixed), `ignored_reason`.

Both tables: RLS on, only admins can read/write, service_role full access for the edge function.

## "Press a button to fix" flow
The **Copy for Lovable** button on each finding copies text like:

> Please fix security finding `rls-missing-on-bug_reports` (Critical):
> Table `public.bug_reports` allows public SELECT.
> Suggested fix: tighten the SELECT policy to admins only.

You paste it into Lovable chat → I read it, write the migration, and the finding disappears on the next scan. Same muscle memory as the Errors tab.

## Deeper re-scan now
After the tables exist, I'll run a deeper scan that goes beyond what the standard check covers:
- Every public table: RLS enabled? GRANTs present? Any policy using `true` / `USING (true)`?
- Every SECURITY DEFINER function: `search_path` set? Caller authorization checked?
- Storage buckets: public buckets that contain user files?
- Auth: leaked-password protection on? Anonymous sign-ups off?
- Edge functions: any without JWT verification that touch user data?

I'll report new findings in the dashboard and tell you which ones I can fix automatically vs. which need your decision.

## Technical notes (skip if you like)
- Tables: `security_scans`, `security_findings` with admin-only RLS via existing `has_role(auth.uid(),'admin')`.
- Edge function: `supabase/functions/run-security-scan/index.ts`, JWT-verified, admin-checked, uses service role for inserts.
- Cron: `pg_cron` + `pg_net` to call the edge function daily.
- Frontend: refactor `src/pages/Health.tsx` to use shadcn `Tabs`; new `SecurityTab.tsx`, `FindingRow.tsx`, `ScanHistory.tsx` components using existing design tokens (no custom colors — severity chips use `destructive`, `warning`-style tokens already in the theme).

## Out of scope (ask if you want them)
- Email/SMS alerts when a critical finding appears.
- Auto-fix without your approval (intentional — you stay in control).
- Aikido API integration (you chose Lovable scanner only).


# Referral Salesperson & Commission Engine

Fixed commission per active paid subscription per month:
Solo R50 · Business R90 · Professional R250 · Enterprise R900.
No clawback on cancellations (past commissions stay earned).

## 1. Database (new tables)

All in Lovable Cloud, RLS enforced.

- **salespersons** — full_name, email, phone, id_number (restricted), banking_details jsonb (restricted), referral_code (unique, auto `INR-XXXX`, server-generated with retry), status (`pending_approval` / `active` / `inactive`), user_id (nullable, links to auth account for portal), approved_at, approved_by.
- **salesperson_access_log** — every read of id_number or banking_details (who, when, which record) for POPIA.
- **commission_rates** — plan_name unique, amount_zar, active_from, active_to (seeded with the 4 amounts above; admin editable).
- **referrals** — links a subscriber (subscriptions.user_id) to a salesperson_id, attributed_at. Set when someone signs up via a referral code.
- **commission_calculations** — salesperson_id + calendar_month unique, active_subs_count, cancellations_count, gross_commission_zar, status (`pending`/`paid`), paid_at, paid_by, notes.
- **commission_line_items** — one row per (calculation, subscription) with plan_name and amount used, for the audit trail and salesperson email breakdown.
- **public_holidays** — date, name (seed ZA holidays for 2026/2027, admin editable).
- **notification_log** — recipient_email, type, related_month, status, sent_at.

RLS summary:
- salesperson can `SELECT` only their own row and their own calculations/line items (via `user_id = auth.uid()`), and never sees `id_number` or `banking_details` (column-level: split into a private view + revoke).
- admin (existing `has_role(...,'admin')`) has full read incl. banking, and is the only role that can `mark_as_paid` or approve applications.
- inserts to `salespersons` from the public wizard go through an edge function using service role, always with `status='pending_approval'`.

## 2. Referral capture

- Landing page and `/pricing` accept `?ref=INR-XXXX` — store code in `localStorage` (`inreco_ref`).
- `payfast-checkout` edge function reads the stored code from the request body, validates it against `salespersons` (must be `active`), and stamps `referrals(subscriber_user_id, salesperson_id)` after PayFast confirms in `payfast-webhook`.
- If subscriber cancels later, `referrals` row is kept — historical commission still valid.

## 3. Monthly commission job

Scheduled edge function `run-commission-month` (pg_cron on the 1st of each month at 02:00 SAST, also manually runnable by admin):

For each salesperson:
1. Find all subscriptions attributed to them where `status IN ('active','past_due','cancelled')` AND had a paid PayFast transaction with `collected_date` in the target calendar month (from `payfast_transactions`).
2. For each such subscription, look up the `commission_rates` row active on the transaction's collected_date for that plan.
3. Upsert one `commission_calculations` row keyed on (salesperson_id, calendar_month) — idempotent re-run safe. Insert matching `commission_line_items`.
4. Count `subscriptions.status='cancelled' AND cancellation_date` in month for cancellations column.
5. Salespeople with zero activity still get a zero-value row so their "we ran the report" email goes out.

## 4. Notifications (Lovable Emails — free, no Resend)

Uses built-in transactional email infra (needs email domain setup — I'll flag if not done).

- `send-commission-emails` edge function, triggered right after the calc job:
  - **To each salesperson**: their code, active subs count, cancellations under their code (subscriber first-name + last-4 of email only, no other PII), total commission, expected payout date (last day of month + 3 SA business days, skipping holidays from `public_holidays`).
  - **To admin** (`casperbadenhorst77@outlook.com` + `badenhorst.casper@gmail.com`): full monthly summary with every salesperson, their referral code, counts, and amount owed. Banking details NOT in email — dashboard only.
- Zero-activity salespeople still receive the summary.

## 5. Admin dashboard — `/admin/commissions`

Gated on `has_role(uid,'admin')`. Tabs:

- **This month / History**: table of every salesperson × month with counts, gross owed, status. "Mark as paid" button per row → sets `paid_at`, `paid_by=auth.uid()`, logs to access log. "Run calculation now" button for the current or prior month.
- **Salespeople**: list all, filter by status. Approve/reject pending applications. Click through to full detail (banking + ID visible here, and only here — access is logged automatically).
- **Applications**: pending approvals with approve/reject.
- **Rates**: edit the 4 plan amounts, with historical rows kept.
- **Public holidays**: manage the ZA holidays list.

## 6. Admin intake — `/admin/salespersons/new`

Simple form: full name, ID number, email, phone, banking block. On save: server generates referral code, sets `status='active'` immediately (admin is trusted), sends welcome email with code + shareable link `https://app.inreco.co.za/?ref=INR-XXXX`.

## 7. Public sign-up wizard — `/partner/apply`

4-step wizard (mobile-first, big buttons):

1. **About you** — name, email, phone.
2. **ID + banking** — ID number, bank name, account holder, account number, branch code, account type. Explain in plain words why it's needed and that it's encrypted.
3. **Confirm** — review + accept partner terms.
4. **Submitted** — "Thanks, we'll email you within 2 business days when your unique referral code is active."

Backend `submit-partner-application` edge function creates the `salespersons` row (`pending_approval`, no referral code yet). Admins get a notification email.

## 8. Partner portal — `/partner`

- Sign in with email/password or Google (same auth as main app).
- On first login after approval, if the auth user's email matches a `salespersons.email` with `status='active'`, link `user_id`.
- Portal shows:
  - Their referral code + copy button + share links (WhatsApp, email, "copy pricing link with ref").
  - This month so far: subscribers under their code, cancellations, projected commission.
  - Payout history table (all past months, amounts, paid/pending).
  - Their profile + banking (last-4 masked view, "request change" button that emails admin — they can't edit banking directly for fraud protection).

## 9. Landing / pricing tweaks

Small "Earn commission — become a partner" link in the footer pointing to `/partner/apply`. No other changes to the buying flow.

## 10. Security & POPIA

- `id_number` and `banking_details` protected by:
  - Column privileges revoked from `authenticated`; only accessible through security-definer functions or service role.
  - Every read from admin dashboard writes to `salesperson_access_log`.
  - Masked helper (`****1234`) for any non-admin surface.
- Wizard rate-limited (5 submissions/hour per IP via a simple table).
- All new tables: RLS enabled + explicit GRANTs; migration follows the required order.

## Cost

Zero new costs: Lovable Cloud tables/functions/cron, Lovable Emails (free tier), same PayFast pipeline. No Resend, no external services.

## Technical notes

- Migration adds all tables, seeds rates + 2026/2027 ZA public holidays.
- `payfast-webhook` extended to write `referrals` when the checkout carried a valid ref code.
- `payfast-checkout` extended to accept and persist the ref code.
- Cron: `select cron.schedule('monthly-commissions','0 0 1 * *', $$ ... net.http_post to run-commission-month ...$$)` — inserted via the insert tool (contains project URL + anon key), not migration.
- Email templates live under `supabase/functions/_shared/transactional-email-templates/` per the transactional email pattern; `email_domain--setup_email_infra` will run first if not already set up.

## Rollout order

1. Migration: tables, RLS, grants, seeds.
2. Referral capture (`?ref=` handling + checkout/webhook wiring).
3. Admin dashboard + intake form.
4. Public wizard + partner portal.
5. Commission job + emails + cron.
6. Manual smoke test on a fake salesperson before announcing.

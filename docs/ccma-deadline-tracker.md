# CCMA deadline tracker with reminders

Route: `/account-app/deadlines` (signed-in + active plan or trial). Linked from the **More** sheet and a **CCMA deadlines** card on `/dashboard`. `/deadlines` redirects there.

General guidance, not legal advice. The disclaimer appears on the page, in every email, and on `/disclaimer` (section 3).

## Supported deadline types

| Type | Start date the user enters | Period | Source | Last day on a non-working day |
|---|---|---|---|---|
| Unfair dismissal referral | Dismissal date, or the final decision to dismiss or uphold it (if later) | 30 days | LRA s191(1)(b)(i) | Interpretation Act s4: Sunday or public holiday → next day |
| Unfair labour practice referral | The act or omission, or when the employee became aware of it (if later) | 90 days | LRA s191(1)(b)(ii) | Interpretation Act |
| Unfair discrimination referral | The act or omission | 6 months | EEA s10(2) | Interpretation Act |
| 30-day conciliation period | The date the CCMA received the referral | 30 days | LRA s135(2), s191(5) | Not rolled (this is information, not a filing deadline) |
| Request arbitration / Labour Court | The certificate of outcome date | 90 days | LRA s136(1)(b), s191(11)(a) | Interpretation Act |
| Rescind or vary an award or ruling | The date you became aware of the award or ruling | 14 days | LRA s144, CCMA Rules r32 | CCMA Rules r3: Saturday, Sunday or public holiday → next working day |
| Labour Court review of an award | The date the award was served | 6 weeks (42 days) | LRA s145(1)(a) | Interpretation Act |
| Other / my own date | You enter the due date yourself | – | – | – |

How the dates are worked out:
- **Counting.** The first day is excluded, so a dismissal on 1 Nov gives a due date of 1 Dec. "6 months" uses calendar months and clamps to the end of the month (31 Aug → 28/29 Feb).
- **Stored date.** We store the *unextended* calendar date as the deadline, because acting by it is always safe. If that date lands on a day that would push the deadline out, the app only *shows* "may move to …"; reminders never use the extended date.
- **Public holidays.** These are computed from the Public Holidays Act: the fixed days, Good Friday and Family Day, and the Monday after a holiday that falls on a Sunday. Once-off declared holidays go in `EXTRA_DECLARED_HOLIDAYS`.
- **Single source of the rules:** `supabase/functions/_shared/ccmaDeadlines.ts`. The app re-exports it from `src/lib/ccma/deadlines.ts`.
- **Database copy.** The database recomputes `due_date` itself in a trigger (`ccma_compute_due_date`), so a client can't store a wrong date. A test keeps the SQL periods in line with the TypeScript.

## Data and access

Tables:
- `ccma_matters`: owner_user_id (the account owner, so team members share it), created_by_user_id, title, employee_name, case_number, dispute_type, trigger_date, custom_due_date, due_date (computed), status (open / done / withdrawn), completed_at, reminder_days int[], email_reminders, reminder_sent_at, notes.
- `ccma_deadline_reminders`: one row per (matter, due date, stage). This is both the in-app feed and the email outbox.

Access (RLS) is the same as generated documents: the account owner and active team members, through `is_account_member`. Users can only change `read_at` on reminders.

## How reminders work

1. **06:30 SAST, pg_cron `ccma-deadline-flag-daily`.** Runs `flag_ccma_deadline_reminders()` for every open matter due between 7 days ago and 60 days ahead.
   - It picks today's stage: the smallest offset in the schedule (default 7, 3, 1, plus the due day 0) that is at least the days left. An overdue matter gets stage −1 once, within 7 days of the due date.
   - It inserts a reminder row if that stage hasn't been sent yet. This catches up after a missed run without sending a burst.
   - It sets `ccma_matters.reminder_sent_at`.
   - Email status is `pending`, or `skipped` if email is off for that matter.
2. **In the app.** Unread reminders show as a banner on `/account-app/deadlines` and a count on the dashboard card. Countdown colours come straight from the due date: green more than 7 days out, amber 7 days or less, red on the due day or overdue.
3. **07:00 SAST, pg_cron `ccma-deadline-email-daily`.** Calls the `ccma-deadline-reminders` edge function.
   - The function re-runs the flagging, which is idempotent.
   - It emails each pending reminder to the address of the person who created the matter. Emails go through the existing `send-transactional-email` queue (Lovable Emails, notify.inreco.co.za, template `ccma-deadline-reminder`), with idempotency key `ccma-reminder-<id>`. Suppression and unsubscribe are handled there.
   - Failures are retried for up to 3 attempts within 3 days.
   - Nothing is emailed if the matter was closed, its email reminders were switched off, or its date changed since the reminder was flagged.

The edge function has `verify_jwt = false`, like `trial-reminders`, and is safe to re-run. If the `CRON_SECRET` edge secret is set, the caller must send `x-cron-secret`, which pg_cron reads from vault `CRON_SECRET`, or the service-role key.

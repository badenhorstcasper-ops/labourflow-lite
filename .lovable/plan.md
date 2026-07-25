
## What the dashboard is actually showing

I pulled the raw data from your database to answer your question directly.

### Who has signed up (besides you)
Only **one** person other than you:

- **duvenhage.marcell@gmail.com** — signed up 24 July 2026, started a **Professional** trial. Status is "pending" (payment not yet confirmed by PayFast).

Your own account (badenhorst.casper@gmail.com) is the other one, marked as a demo Solo account.

That's it. Two total. The "Signups = 2" number is correct.

### Why "Active subscriptions = 1"
Only your demo counts as active. Marcell's is still "pending" (waiting for PayFast to confirm the first payment), so it doesn't count as active yet. This is correct too.

### Why "Payments (completed) = 4" is misleading (the real bug)
The dashboard counts every row in the PayFast webhook log where the status text says "COMPLETE". Looking at the actual rows, those 4 are **not real successful payments**:

- 2 rows: old sandbox test payments from May 2026 (casperbadenhorst77@outlook.com, R259 each)
- 2 rows: attempts we **rejected** in June because of an amount mismatch (someone tried to pay R0 for a R499 Business plan)

**You have received zero real live customer payments through PayFast.** That matches the fact that you've never got a PayFast notification email — because nothing real has come through. The dashboard number is just counting the wrong thing.

## The fix

Change the "Payments (completed)" tile to only count payments we actually **accepted and matched to a real subscriber**, not raw webhook rows. Concretely:

1. In the admin stats function, count PayFast webhook rows where `outcome = 'accepted'` (not just where the status text says "COMPLETE"). That excludes the rejected attempts and the test noise.
2. Rename the tile from "Payments (completed)" to **"Successful payments"** so it's obvious what it means.
3. Add a second small tile: **"Rejected payment attempts"** so you can still see when something suspicious hits the webhook (like the R0/R499 attempts), without it inflating the success number.
4. Also add a tiny note under "Signups" showing how many are demo/owner accounts vs real customers, so at a glance you can see "0 real paying customers yet" instead of guessing.

No other numbers on the page need to change — signups, active subscriptions, page views, chairperson bookings, documents generated and contact messages are all already accurate against the raw data.

### Technical details
- File: `supabase/functions/admin-stats/index.ts` — swap the `payfast_webhook_log` count filter from `.eq("payment_status","COMPLETE")` to `.eq("outcome","accepted")`, and add a second count with `.eq("outcome","rejected")`.
- File: `src/pages/Admin.tsx` — rename the tile, add the "Rejected attempts" tile, and add the small "(x demo / x real)" caption under Signups. Real = signups whose email is not in the demo/owner allowlist we already use.

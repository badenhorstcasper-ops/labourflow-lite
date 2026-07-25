## Goal
Every owner/admin page shows numbers that are true at the moment of viewing — so you can tell at a glance whether sign-ups, subscriptions and partner activity are picking up.

## What's there today
- `/admin` (Admin dashboard) already fetches from the `admin-stats` server function and auto-refreshes every 60 seconds.
- `/admin/overview` (Owner overview) fetches from `owner-overview` but ONLY on page load and when you click Refresh — no auto-refresh.
- `/admin/commissions`, `/admin/marketing`, `/admin/partner-decision` load once and never refresh.
- Cached data can also make a screen look stale even when the numbers on the server just changed.

## What I'll change

### 1. Always-fresh loading on every admin/owner page
- Add a small shared hook (call it `useLiveData`) that:
  - runs the fetch on mount,
  - re-runs it every 30 seconds automatically,
  - re-runs it whenever the browser tab becomes visible again (so switching back to the tab shows current numbers instantly),
  - re-runs it when the browser regains internet,
  - tells the server "don't give me a cached copy" so numbers are always straight from the database.
- Wire this hook into: `/admin`, `/admin/overview`, `/admin/commissions`, `/admin/marketing`.

### 2. Show when the data was last refreshed
- On every admin/owner page, add a small "Updated a few seconds ago · refreshes automatically" line next to the Refresh button, so you can trust what you're seeing.

### 3. Make the numbers themselves reflect "right now"
- Owner overview will also include:
  - sign-ups in the last 24 hours, last 7 days, last 30 days,
  - subscriptions started in the last 24 hours / 7 days / 30 days,
  - partner-attributed vs direct sign-ups for the last 24 hours / 7 days / 30 days (not just all-time),
  - most recent 10 sign-ups and most recent 10 subscriptions with timestamps.
- Admin dashboard will also include:
  - active-in-last-24-hours page-view count,
  - most recent 10 payments with amount and time.

### 4. Server-side freshness
- Update the `admin-stats` and `owner-overview` server functions so they never send a cached response (add no-cache headers). Every call goes straight to the database.

## Out of scope
- No changes to landing/marketing pages, partner-facing pages, or any user-facing app screens.
- No changes to how data is written — only how it's read and displayed on owner/admin screens.
- No new database tables.

## How you'll experience it
Open any owner/admin page and the numbers are live. Leave the tab open — they refresh themselves every 30 seconds. Switch to another tab and come back — they refresh immediately. A small timestamp under the header tells you when the last refresh happened.

## Goal
1. Make sure the two super-admin emails (`badenhorst.casper@gmail.com` and `casperbadenhorst77@outlook.com`) can invite unlimited teammates regardless of subscription.
2. Confirm normal subscribers get the advertised seat counts (Business 5, Professional 10, Enterprise 15).
3. Give the super admin a single visible button in the app header that opens an admin dashboard showing user count, recent errors, and security issues — all fixable in as few clicks as possible.

## What's wrong today
- The Account modal sits in the legacy `index.html` (lines ~2333–2400). Seat cap = `SEAT_LIMITS[plan]` with a fallback of `1`. With no active subscription, the owner is stuck at 1 seat and the **+ Add invite** button is disabled — exactly what the screenshot shows.
- The `invite-team-member` edge function applies the same cap server-side (`Solo: 1`), so even if the UI was unlocked the server would reject it.
- The React `TeamManagement.tsx` (used only on the React account surface) has the same `SEAT_LIMITS` table with no admin override.
- There is already an `/admin` page (`src/pages/Admin.tsx`) wired to the `admin-stats` edge function showing signups, page views, payments, top pages, recent docs. It works, but the legacy app has no link to it, so the super admin has to type the URL.
- The two admin emails are already auto-granted the `admin` role via the `grant_owner_admin_on_signup` trigger (only the outlook address is in there today — the gmail address is missing).

## Changes

### 1. Super-admin seat override (server + both UIs)
- **`supabase/functions/invite-team-member/index.ts`** — before the seat check, call `has_role(ownerId, 'admin')`; if true, skip the cap entirely. Keep the existing duplicate-email and self-invite guards.
- **`index.html`** (legacy Account modal, `refreshAccountModal`) — after fetching the subscription, also call `supabase.rpc('has_role', { _user_id: currentUser.id, _role: 'admin' })`. If true, set `cap = Infinity`, show "Unlimited (admin)" in the seats line, and never disable the **+ Add invite** button.
- **`src/components/TeamManagement.tsx`** — same admin check on load; when admin, set `seatLimit = Infinity`, label as "Unlimited (admin)", never disable the Invite button.

### 2. Make sure the gmail admin also gets the role
- New migration: extend `grant_owner_admin_on_signup` to match either email, and back-fill the role for any existing user with either email so both accounts have `admin` immediately on next sign-in.

### 3. Verify subscriber seat counts
- No code change needed — the `SEAT_LIMITS` table (Solo 1, Business 5, Professional 10, Enterprise 15) already matches the pricing page. Add a one-line code comment in both the legacy modal and the edge function pointing to `src/pages/Pricing.tsx` so the three places stay in sync.

### 4. One-click super-admin dashboard
- Add a small **🛡 Admin** button in the legacy header next to the existing **👤 Account** button (`index.html` line ~759). It is rendered only when `has_role(currentUser.id,'admin')` is true. Clicking it navigates to `/admin`.
- The `/admin` page already shows totals (signups, active subs, payments, documents, bookings, contacts), page-view trends, top pages, recent signups, recent documents. Extend it with two more cards so the super admin can act without leaving the page:
  - **Recent errors** — last 10 rows from `error_logs` (message, path, created_at). Add a "Mark resolved" button per row that flips a `resolved` flag (column already exists or will be added via tiny migration if missing — verified at build time).
  - **Open security findings** — call the existing `run-security-scan` edge function on page load and list any findings, each with a "Mark resolved" button that calls `security--manage_security_finding` via a small edge function wrapper. Include a top-right **Re-run scan** button.
- Auto-refresh stays at 60 s; both new sections refresh in the same tick.

### Technical notes
- Admin role lookup uses the existing `public.has_role(uuid, app_role)` RPC — no new SQL functions needed except the trigger update.
- All UI changes respect the existing dark theme; no design-token changes.
- No changes to pricing, billing, or non-admin user flows.

### Out of scope
- Editing the `admin-stats` permissions model (already admin-gated).
- Rewriting the legacy Account modal in React.
- Adding bulk invite or CSV import.

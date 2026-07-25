
## What's actually broken

Your screenshots aren't from the React app — they're from the **legacy landing page (`index.html`)**, which has its own embedded mini-app (Account modal, "+ Add invite", CARA-like screen). When you sign in on the landing page it keeps you there instead of sending you into the real React app. That's why:

- The "+ Add invite" button is dead (the landing version isn't wired to the invite backend — the React version at Billing → Account is).
- You don't see the Admin/Owner dashboard nav (it only exists in the React app).
- The approve/reject link in the partner email lands on `/admin/partner-decision`, but the *session* that page checks belongs to the React app; from the landing HTML you may appear "signed in" without hitting the same auth flow.

The React admin pages already exist (`/admin`, `/admin/overview`, `/admin/commissions`, `/admin/partner-decision`) — they're just not linked anywhere and you're never routed to them.

## The plan (small, targeted changes only)

### 1. Landing HTML: send signed-in users into the React app
In `index.html`, after a successful login/signup redirect to `/app` (React) instead of showing the embedded HTML app. Admins get sent to `/admin/overview` instead. This makes the React app the single source of truth and instantly fixes the missing invite button, missing admin nav, and partner-decision session issue — without touching the legacy landing code further.

### 2. React AppShell: add admin nav for owner accounts
In `src/components/AppShell.tsx`, detect `has_role(uid,'admin')` and, when true, add three header links:
- **Owner** → `/admin/overview`
- **Partners** → `/admin/commissions`
- **Admin** → `/admin`

So once signed in as `badenhorst.casper@gmail.com` or `casperbadenhorst77@outlook.com` you always see the admin controls from every page.

### 3. Owner Overview: approve/reject partners in-app
Extend `src/pages/AdminOverview.tsx` with a "Pending partner applications" section that lists rows from `salespersons` where `status = 'pending_approval'` with **Approve** and **Reject** buttons that call the existing `approve-salesperson` edge function. This means you never depend on the email link — you can approve any application straight from the dashboard.

Also keep `/admin/partner-decision` working (email link still lands there); no change needed there beyond #1 which fixes the session.

### 4. `/pricing` back button
Add a small "← Back" link at the top of `src/pages/Pricing.tsx` that goes to `/` (landing).

### 5. End-to-end verification (no guessing)
After the changes, drive the live preview with Playwright to click through, signed in as your admin account:
- Landing → Get Started → `/pricing` (back button works, trial button opens PayFast checkout call).
- Sign-in → lands on `/admin/overview` (admin) or `/app` (regular user).
- AppShell shows Owner / Partners / Admin links.
- Owner Overview shows subscriber counts + pending partner applications; Approve button runs the function and returns the referral code.
- Partner email approve link → `/admin/partner-decision?...` → approves successfully.
- Account → Invite Member dialog opens and sends (admin has unlimited seats).
- Landing footer links: Terms / Privacy / Disclaimer / Become a partner all resolve.

Screenshots of each step will be attached in the follow-up so you can see the pass/fail before publishing.

## Technical notes

- Files touched: `index.html` (post-login redirect only), `src/components/AppShell.tsx` (admin nav), `src/pages/AdminOverview.tsx` (pending list + actions), `src/pages/Pricing.tsx` (back link).
- No database migrations, no new edge functions, no schema changes — this uses the existing `approve-salesperson`, `has_role`, `salespersons`, `subscriptions`, and `referrals` pieces already in place.
- The legacy embedded Account/CARA UI inside `index.html` stays in the file (removing it would be a big rewrite) but becomes unreachable in practice because signed-in users are redirected out.

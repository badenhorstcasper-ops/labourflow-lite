## Goal

1. Make "Start using the app" / "Open app" land on `/dashboard` instead of `/account-app/documents`.
2. Drive the live preview with the test account `casper@inreco.co.za` and verify every key flow end-to-end, fixing bugs found along the way.

## Part 1 — Code change (small)

Update three call sites so the main entry into the app is `/dashboard`:

- `src/pages/CompanyProfile.tsx`
  - line 135: `navigate("/account-app/documents")` → `navigate("/dashboard")` (post-save redirect for new profiles).
  - line 196: post-save confirmation panel button → `/dashboard`.
  - line 281: large "Start using the app →" button → `/dashboard`.
- `src/components/AppShell.tsx`
  - line 39: header "Open app →" button → `/dashboard`.
  - line 34: leave the "Documents" tab link pointing at `/account-app/documents` (it's a section tab, not the app entry).

Button label stays "Start using the app →" / "Open app →".

## Part 2 — End-to-end test run

I'll use `browser--view_preview` against the preview URL and sign in as `casper@inreco.co.za`. Each step below will be observed/acted on, with screenshots at key checkpoints and console + network logs checked for errors.

### 1. Marketing → Checkout → PayFast
1. Land on `/`, verify hero, nav, footer, links.
2. Navigate to `/pricing`, pick a paid plan, follow PayFast sandbox redirect.
3. Complete sandbox payment, confirm return to `/payment-success`.
4. Confirm `subscriptions` row updated for the user (via `supabase--read_query`).
5. Also visit `/payment-cancelled` path to confirm graceful copy.

### 2. Auth
1. Sign out, then sign back in with the test credentials at `/auth`.
2. Try a deliberately wrong password → expect inline error, no crash.
3. Trigger "forgot password" flow if present — verify it doesn't auto-log-in.
4. Confirm protected routes (`/dashboard`, `/account-app/*`, `/settings`) redirect to `/auth` when signed out.

### 3. Company profile save + navigation
1. Go to `/account-app/profile`, edit company name, upload a logo to the `company-logos` bucket, save.
2. Verify toast + post-save confirmation panel appear.
3. Click "Start using the app →" → expect `/dashboard` (after fix).
4. Reload `/account-app/profile` and confirm saved values + logo persist.

### 4. Documents (core feature)
1. From `/account-app/documents`, generate at least one document of each available template.
2. Verify each PDF + DOCX downloads, opens, and uses iNRECO branding (never "Labourflow" / "iNRECO Consulting"), per the project memory.
3. Verify `next_document_number` increments and `generated_documents` row is created.
4. Create a share link (`/d/:token`), open it in a fresh tab, confirm it renders and logs to `share_access_log`.
5. Revoke / regenerate share link if the UI supports it; confirm old token 404s.

### 5. Health + misc
1. Hit `/account-app/health` and confirm it loads cleanly.
2. Spot-check `/settings`, `/contact`, `/terms`, `/privacy`, `/disclaimer`.

### Reporting
At the end I'll produce a single report with:
- Pass / Fail per step (with screenshots for failures).
- Console + network errors seen.
- Any bugs I fixed inline (with file + line summary).
- Anything that needs your decision before I touch it (e.g. destructive actions, real payments).

### Out of scope
- No backend schema or RLS changes unless a test uncovers a blocker.
- No landing/marketing copy redesign.
- No new templates or features.

# Pre-launch audit — iNRECO

Below is a full sweep across functionality, error reporting, security, payments, SEO, and operations. Items are grouped by priority. Each "Fix" is a small, scoped change I can implement once you approve.

---

## P0 — Must fix before launch (blockers)

### 1. `register_device` RPC missing in DB
Console shows:
> `Could not find the function public.register_device(_device_id, _label, _ua) in the schema cache`

But the function **does exist** in the DB (it's listed under db-functions). This means the Supabase client cache is stale OR signature mismatch. Every login currently logs a warning and device registration silently fails — your 2-device limit is **not being enforced**.
**Fix:** re-create the function with `CREATE OR REPLACE` to refresh the PostgREST schema cache, and grant `EXECUTE ... TO authenticated`. Verify by logging in and checking `user_devices` gets a row.

### 2. Subscriptions table — confirm no client-side INSERT
Security scan flags that `subscriptions` should never accept an INSERT from an authenticated user (would let a user grant themselves any plan). Need to confirm RLS denies INSERT/UPDATE from `authenticated` and only `service_role` (PayFast webhook) can write. If a policy is missing, add explicit deny.
**Fix:** add a migration with `REVOKE INSERT, UPDATE ON public.subscriptions FROM authenticated, anon;` and verify webhook still works (it uses service role).

### 3. PayFast webhook end-to-end test
The webhook is the only path to plan activation. Before launch I should:
- Confirm `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE` secrets are set
- Confirm webhook URL configured in PayFast dashboard points to live edge function
- Run one sandbox transaction and verify a row lands in `subscriptions` with `status='active'`

### 4. Edge function secrets sanity check
Need to confirm these are set in Lovable Cloud:
- PayFast: merchant id/key/passphrase, sandbox-vs-live flag
- `submit-contact`: any email/SMTP secrets it needs
- `invite-team-member`: email sender config
I'll list missing ones once I check.

### 5. Auth configuration
- HIBP leaked-password check: confirmed in SECURITY.md as enabled — re-verify in Cloud
- Google OAuth: confirm enabled and `redirect_uri` includes `https://app.inreco.co.za` AND `https://inrecoapp.inreco.co.za` AND the preview domain
- Email confirmation: currently auto-confirmed? Decide intended behaviour for launch
- Site URL + additional redirect URLs in Auth settings must include your custom domain

---

## P1 — Strongly recommended before launch

### 6. Stale duplicate domains
You have two production hostnames in play: `app.inreco.co.za` (custom domain) and `inrecoapp.inreco.co.za`. Pick one canonical, 301-redirect the other, and ensure:
- PayFast webhook callback URL uses canonical
- Auth redirect URLs include both until redirect is in place
- Canonical `<link rel="canonical">` in `index.html`

### 7. Error reporting end-to-end check
- `error_logs` + `bug_reports` tables exist with admin-only read — good
- Verify your account has the `admin` role in `user_roles` (otherwise you can't see `/account-app/health`)
- Trigger a deliberate error from the legacy app to confirm `window.iNRECO.logError` writes a row

### 8. Security definer function grants (Supabase linter WARNs)
6 linter warnings about `SECURITY DEFINER` functions being callable by anon/authenticated. Several of yours are intentional (`accept_team_invite`, `current_account_owner`, `next_document_number`, `has_role`, `register_device`, `link_*_on_signup`). I should:
- Revoke EXECUTE from `anon` for everything except what truly needs anonymous access
- Keep `authenticated` grants only on the ones the React app calls

### 9. Document generation prerequisites
The `generateDocument` flow throws `company_profile_incomplete` if profile is empty. Confirm:
- New-signup flow prompts user to fill `/account-app/profile` before first document
- `documents` bucket is private (it is) and signed URLs expire appropriately (1h owner / 30m share — confirmed)
- Brand test (`src/lib/documents/__tests__/brand.test.ts`) passes — run `bunx vitest run`

### 10. Subscription tier enforcement
`accept_team_invite` enforces seat cap. But the rest of the app needs to enforce:
- AI question quota for Solo (50/month) — is this counted anywhere?
- Plan-gated features (Professional WhatsApp support, Enterprise always-on CARA)
I should check the legacy app's quota logic.

---

## P2 — Polish & SEO

### 11. SEO basics on `index.html`
- Verify single H1, `<title>` < 60 chars with keyword, meta description < 160 chars
- `og:image`, `twitter:card`, `canonical`
- `robots.txt` and `sitemap.xml` for `/`, `/pricing`, `/contact`, `/terms`, `/privacy`, `/disclaimer`
- JSON-LD `Organization` + `SoftwareApplication` schema

### 12. 404 handling
`public/404.html` exists for static hosting; React Router `*` route redirects to `/`. Confirm hard refresh on `/account-app/xxx` works on the production host (SPA fallback).

### 13. Service worker (`public/sw.js`)
Verify it doesn't cache stale `index.html` or React bundles — a bad SW is the #1 cause of "users see old version" complaints.

### 14. Legal pages
`/terms`, `/privacy`, `/disclaimer` route to React pages. Quick content review for: company name "iNRECO", correct entity name, POPIA mentions (you're South Africa), contact email.

### 15. Branding consistency
Memory rule already in place: never use "Labourflow" or "iNRECO Consulting". Quick grep to confirm no stragglers in UI strings or generated-doc templates.

### 16. Mobile/responsive sweep
You mentioned footer issues recently. Sweep the landing page + `/account-app/*` at 360px, 768px, 1024px.

---

## P3 — Operational readiness

### 17. Backups
Confirm Lovable Cloud daily backups are enabled (default yes), and you know how to restore.

### 18. Admin role bootstrap
Make sure your own user_id has a row in `user_roles` with role=`admin`. Otherwise `/account-app/health` is invisible to you.

### 19. Contact form deliverability
`submit-contact` edge function — where do messages land? Email? Just `contact_messages` table? You need a notification path or you'll miss leads.

### 20. Analytics
No analytics installed. Decide if you want Plausible/GA4 before launch.

---

## Recommended next step

If you approve, I'll work P0 items first in this order:
1. Re-create `register_device` to refresh schema cache + grants
2. Lock down `subscriptions` table writes
3. Audit + tighten SECURITY DEFINER grants
4. Confirm/list missing edge-function secrets and auth redirect URLs
5. Run the vitest suite and report

Then P1 and P2 in follow-up turns.

Tell me which of P0–P3 to tackle, or say "do all P0" and I'll start there.

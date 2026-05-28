# Audit findings + fixes

## A. Critical / high findings → fix now

### A1. PayFast webhook is unauthenticated (CRITICAL)
`supabase/functions/payfast-webhook/index.ts` accepts any POST and grants the named plan to the named user. No signature check, no merchant validation, no server-to-server postback. Anyone who knows the URL (it's reachable; `verify_jwt=false`) can activate Enterprise for any email/user_id.

**Fix:**
- Validate the ITN signature using the PayFast passphrase (MD5 of sorted params + passphrase, compared to `signature`).
- Verify `merchant_id` matches our configured merchant.
- Restrict source to PayFast IP ranges (`x-forwarded-for` check against the documented PayFast IPs).
- Do a server-to-server postback to `https://www.payfast.co.za/eng/query/validate` (sandbox URL in sandbox) and require an `VALID` response before mutating any row.
- Store `PAYFAST_PASSPHRASE`, `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_MODE` (`sandbox`/`live`) as secrets; remove hardcoded sandbox creds from `src/pages/Pricing.tsx` and read them from a small new edge function (`payfast-config`) or env-injected constants at build time.
- Add an idempotency guard on `m_payment_id` so replays don't re-activate.

### A2. Replace info@inreco.co.za with a contact form
- New table `public.contact_messages` (name, email, subject, message, created_at, ip_hash) with RLS: insert open to `anon` + `authenticated`, select restricted to a future admin role only.
- New edge function `submit-contact` (`verify_jwt = false`) — zod-validates input, rate-limits per IP (in-memory + DB count last 1h), inserts row, and (optional) calls Lovable Email to notify the owner. For now we just store; you can wire email later.
- New page `src/pages/Contact.tsx` rendered at `/contact` with a simple form.
- Replace the remaining `mailto:info@inreco.co.za` in `src/pages/Pricing.tsx` ("Contact Us" / Enterprise CTA) with a `Link to="/contact?plan=Enterprise"`. Sweep the codebase for any other `info@inreco.co.za` and remove.

### A3. Share-link page leaks documents to anyone with the URL
`/d/:token` returns signed file URLs for 30 days with no rate limiting and no audit. Tokens are 32 hex chars — fine — but there's no way to detect token enumeration or revoke after the fact except per-doc.

**Fix:**
- Add `share_access_log` table (doc_id, accessed_at, ip_hash, ua_hash) and log every successful `get-shared-document` call.
- Lower default `share_expires_at` from 30 days → 7 days (configurable per document later).
- Reduce signed URL TTL from 30 min → 10 min.
- Reject after N failed/expired token lookups per IP in a 10-min window.

## B. Medium findings → fix now

### B1. Subscriptions table has no INSERT/UPDATE policy but webhook uses service role — OK, but no way for owner to cancel
Add an `UPDATE` policy: a user can set their own row's `status = 'cancelled'`. Add a tiny "Cancel subscription" button on `Settings.tsx` that PATCHes the row (PayFast subscription cancellation also requires an API call — out of scope unless you want it now; flag it).

### B2. Seat-limit bug in `invite-team-member`
`used = (usedCount ?? 0) + 1; if (used >= seatLimit)` — off-by-one. On Business (5 seats) this blocks the 5th invite (owner + 4 members) when it should allow up to 5 members + owner per the docs (or 4 + owner if seat includes owner — pick one and fix consistently). Fix to match the `accept_team_invite` RPC math (owner +1, compare against cap).

### B3. `register_device` enforces a 2-device limit at the function but `user_devices` has no INSERT RLS policy
Currently inserts only happen via the SECURITY DEFINER function, which is fine, but explicitly `REVOKE INSERT ON public.user_devices FROM authenticated` to make the contract enforced, not conventional.

### B4. Leaked-password protection (HIBP) not enabled
Enable via `configure_auth` — blocks signups/password changes with known-breached passwords.

### B5. CompanyProfile: no input validation
`src/pages/CompanyProfile.tsx` (and the contact form, the team-invite email field) should use zod schemas with length caps (company_name ≤120, accent_color must match `/^#[0-9a-f]{6}$/i`, URLs validated, etc.). Prevents oversized/garbage data from breaking PDF rendering.

## C. Low findings / informational (report only — no auto-fix)

- 6× linter warnings: SECURITY DEFINER functions executable by `anon`/`authenticated`. These are intentional (`current_account_owner`, `has_role`, `next_document_number`, `accept_team_invite`, `register_device`, `link_*_on_signup`) and properly guard with `auth.uid()` checks inside. Will document in security memory and mark as accepted.
- `company-logos` bucket is public and listable. Acceptable for logos but document it.
- PayFast sandbox keys committed in `Pricing.tsx` — will move to env/secrets as part of A1.
- `accept_team_invite` doesn't verify the invited email matches the signed-in user's email — any signed-in user who knows a token can claim a seat. Tighten with an email match (or remove email match if invite tokens are meant to be the sole secret — your call; default I'll apply: tokens are the sole secret, but log the accepting user_id + email for audit).

## D. Functionality gaps (report only)

- No "Cancel subscription" or "Change plan" in-app (only "subscribe" via PayFast).
- No PayFast subscription-cancellation API call (today, cancelling in-app just flips the local `status` — PayFast keeps billing). Worth implementing later.
- No email notifications on document share / subscription activation. Lovable Emails infra not yet set up.
- No admin/back-office view for you to see contact form submissions, subscriptions, or users.
- No password-reset flow surfaced in UI (Supabase handles the email, but there's no "Forgot password?" link on `Auth.tsx` — should verify).
- `/d/:token` Share page has no "report this document" or owner-revoke shortcut.
- No CSP / security headers on the static site (`index.html` has none).

## E. Implementation order (will execute after approval)

1. DB migration: `contact_messages`, `share_access_log`, INSERT-revoke on `user_devices`, subscription self-cancel policy, fix seat-limit math via SQL view if needed.
2. Edge functions: harden `payfast-webhook`; add `submit-contact`; harden `get-shared-document` with logging + tighter TTLs.
3. Secrets: prompt you to add `PAYFAST_PASSPHRASE` (live + sandbox), `PAYFAST_MERCHANT_ID_LIVE`, `PAYFAST_MERCHANT_KEY_LIVE`, `PAYFAST_MODE`. (Sandbox values can stay defaults.)
4. UI: `Contact.tsx` page + route; replace `mailto:` CTAs; add zod validation to CompanyProfile & invite forms; "Cancel subscription" button in Settings.
5. Auth: enable HIBP password protection.
6. Security memory: record accepted findings.

## E1. Email forwarding (not in code)
`info@inreco.co.za → casperbadenhorst77@outlook.com` cannot be set from the app — it's a mailbox setting at your domain host. Options I'll write into the README:
- **Cloudflare Email Routing** (free): add domain to Cloudflare → Email → Routing → create rule `info@inreco.co.za → casperbadenhorst77@outlook.com`. Requires 3 MX records + 1 TXT.
- **Your current host** (cPanel/Zoho/Google Workspace): add a forwarder/alias to that Outlook address.

Since you also asked to replace it with a contact form in-app, you may not even need the forwarder anymore — but it's still worth setting up to catch any externally-sent mail.

## Secrets I'll request after approval
- `PAYFAST_PASSPHRASE` — your PayFast passphrase from the dashboard (Settings → Integration). Required to verify ITN signatures.
- `PAYFAST_MERCHANT_ID` — live merchant ID (sandbox `10000100` stays as a fallback).
- `PAYFAST_MERCHANT_KEY` — live merchant key.
- `PAYFAST_MODE` — `sandbox` or `live`.

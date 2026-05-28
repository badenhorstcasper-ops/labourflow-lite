# Plan: Option B — PayFast hardening (no passphrase) + finish audit fixes

You chose Option B, so I'll close as much PayFast risk as possible without needing a passphrase from you, then finish the remaining frontend pieces from the audit.

## 1. PayFast webhook hardening (no passphrase)

Edit `supabase/functions/payfast-webhook/index.ts`:

- **Merchant ID allowlist** — reject any ITN whose `merchant_id` field is not your live merchant ID (`12090292`). Stops attackers POSTing arbitrary payloads.
- **PayFast IP allowlist** — only accept requests from PayFast's published ITN source ranges (`www.payfast.co.za`, `sandbox.payfast.co.za`, `w1w/w2w.payfast.co.za`). Resolve at cold start, cache, re-check on each request.
- **Server-to-server validation callback** — POST the raw ITN body back to `https://www.payfast.co.za/eng/query/validate` (PayFast's built-in verification endpoint that doesn't require the passphrase). Reject if the response isn't `VALID`. This is PayFast's officially supported way to verify without a signature.
- **Idempotency** — store `m_payment_id` / `pf_payment_id` and reject duplicates so a replayed webhook can't re-activate or downgrade a plan.
- **Amount + plan cross-check** — verify `amount_gross` matches the price of the `plan_name` being activated. Prevents someone activating Enterprise by paying for Solo.
- **Logging** — write all accepted + rejected ITN attempts to a new lightweight `payfast_webhook_log` table (owner-only read) so you can audit.

Hardcode the merchant ID (`12090292`) and key (`3xbkln8wrhwq`) in the function — they're not secret. Mode toggles between sandbox/live via a `PAYFAST_MODE` constant in code (no secret needed).

## 2. Add `payfast_webhook_log` table

New table for the idempotency + audit trail above. RLS: only the matched `subscriptions.user_id` can read their own log rows; service role writes. Includes `m_payment_id` UNIQUE for idempotency.

## 3. Finish remaining frontend audit work

Carry over from earlier in this session:

- **`/contact` page + route** — new `Contact.tsx` with the contact form (name, email, subject, message, optional plan interest), posts to the existing `contact_messages` table via the `submit-contact` edge function.
- **`submit-contact` edge function** — validates input with Zod, hashes IP, inserts into `contact_messages`. Public (no JWT).
- **Pricing Enterprise CTA** — replace the `mailto:` link with a button linking to `/contact?plan=Enterprise`.
- **Footer text** — already changed in an earlier turn; verify it's still "iNRECO provides IR guidance, not legal advice · iNRECO" with no email.
- **Settings cancel subscription button** — wire to update `subscriptions.status = 'cancelled'` using the policy added earlier.
- **Share-link viewer** — `get-shared-document` edge function already drafted with TTL + access logging; finalize and deploy.

## 4. Audit report

Deliver a short markdown report at `/mnt/documents/security-audit-2026-05-28.md` summarizing:
- Findings by severity (critical / high / medium / low)
- What was fixed in this session
- What's deferred (full PayFast signature verification — needs your passphrase later)
- Recommended follow-ups

## Out of scope (deferred until you provide a passphrase)

- HMAC signature verification of the ITN payload. The PayFast `/eng/query/validate` callback closes most of the same risk, but signature verification is still the gold standard and we should add it later.

## Technical details

- Migration: new `payfast_webhook_log` table with `m_payment_id text unique`, `pf_payment_id text`, `payload jsonb`, `outcome text`, `subscription_id uuid null`, `created_at`. Grants: `service_role ALL`, `authenticated SELECT` gated by RLS to owner.
- IP allowlist: resolve via `Deno.resolveDns` at module load; refresh every 6h via timestamp check.
- Validate callback uses `fetch` with `application/x-www-form-urlencoded` body equal to the raw ITN body minus the `signature` field.

Tell me to proceed and I'll implement everything above.

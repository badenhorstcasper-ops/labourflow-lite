# Launch hardening plan

Three parallel workstreams, each independently shippable.

## 1. PayFast go-live

**Goal:** flip from sandbox to real money safely.

- Add a single source of truth in `src/pages/Pricing.tsx`:
  - Read `import.meta.env.VITE_PAYFAST_LIVE` ("true" / "false").
  - When live: `PAYFAST_URL = https://www.payfast.co.za/eng/process`, `MERCHANT_ID = 12090292`, `MERCHANT_KEY` from a new public env var `VITE_PAYFAST_MERCHANT_KEY` (the merchant key is not secret, it goes in the form).
  - When not live: keep current sandbox values.
- Remove `<TestModeBanner />` from `Pricing.tsx` and `PaymentCancelled.tsx` (and delete the component) when `VITE_PAYFAST_LIVE === "true"` — render conditionally so preview still shows it.
- Add edge-function secret `PAYFAST_MODE=live` (webhook already branches on this for host, IP allowlist, and validate URL — no code change).
- Add optional signature verification in `supabase/functions/payfast-webhook/index.ts`:
  - Read new secret `PAYFAST_PASSPHRASE` (only if user sets one in PayFast dashboard).
  - If present, compute MD5 of sorted POST fields + `&passphrase=...` and compare to `data.signature`; reject on mismatch.
  - Also send the same signature on the form by computing it client-side is not possible (passphrase is secret) — so signature on outbound form stays empty; passphrase is only used for ITN verification.
- Capture the PayFast subscription token from the ITN so we can cancel later:
  - Migration: `ALTER TABLE public.subscriptions ADD COLUMN payfast_token text, ADD COLUMN pf_payment_id text;`
  - Webhook writes `data["token"]` and `data["pf_payment_id"]` on accepted ITNs.
- Verify schema on the live project matches what the webhook writes (`email`, `trial_ends_at`, `payfast_token`, `pf_payment_id`, plus `payfast_webhook_log` with `UNIQUE(m_payment_id)`). If anything is missing, ship a migration in the same change.
- Align `supabase/config.toml` `project_id` with `.env` (`riqswihuzclbyjemynyd`) and update `docs/subscriptions.sql` to the current shape.

**User action required (cannot be automated):**
1. Activate live recurring billing on the PayFast merchant account.
2. Set `VITE_PAYFAST_LIVE=true` and `VITE_PAYFAST_MERCHANT_KEY=<live key>` in project env.
3. Add secret `PAYFAST_MODE=live` (and optional `PAYFAST_PASSPHRASE`).
4. Do one real R259 Solo transaction end-to-end as smoke test.

## 2. Subscription gating

**Goal:** only `trialing` or `active` subscribers can use CARA / Generate Docs.

- New hook `src/hooks/useSubscription.ts`: reads the current user's row from `subscriptions` (or the owner's row if the user is a team member via `current_account_owner()`), returns `{ status, planName, trialEndsAt, loading }`.
- New route guard `src/components/RequireSubscription.tsx`:
  - If `loading` → spinner.
  - If `status` is `trialing` or `active` → render children.
  - Otherwise → redirect to `/pricing` with a banner "Your trial has ended — pick a plan to keep using iNRECO."
- Wrap `/`, `/account-app/dashboard`, `/account-app/generate`, `/account-app/documents` in `RequireSubscription` inside `src/App.tsx`. Leave `/auth`, `/pricing`, `/contact`, `/payment-success`, `/payment-cancelled`, `/legal/*`, `/share/*` open.
- Show a small "Trial: X days left" pill in `AppShell` header when `status==='trialing'`.

## 3. Cancel-from-app flow

**Goal:** user can cancel their subscription without leaving the app.

- New edge function `supabase/functions/payfast-cancel/index.ts`:
  - Verify JWT in code (signing-keys pattern).
  - Look up caller's `subscriptions` row, read `payfast_token`.
  - POST to PayFast `https://api.payfast.co.za/subscriptions/{token}/cancel` with the documented auth headers (`merchant-id`, `version`, `timestamp`, `signature` built from merchant key + passphrase).
  - On success, update `subscriptions.status = 'cancelled'`, `updated_at = now()`.
  - Return JSON `{ ok: true }`. CORS + zod-validated empty body.
- Add a "Cancel subscription" button in `src/pages/Settings.tsx` under a "Billing" card showing current plan, status, next billing date. Confirms via AlertDialog, then calls the function.
- Webhook already handles PayFast's cancel ITN by status — extend it: when `data.payment_status === 'CANCELLED'` (or token-cancel ITN), set `subscriptions.status='cancelled'` without requiring a plan/amount match.

## Technical details (for reference)

```text
Pricing.tsx ─► PayFast (live host) ─► ITN ─► payfast-webhook ─► subscriptions row
                                                                       │
Settings.tsx ─► payfast-cancel fn ─► PayFast API ──cancel──────────────┘
                                                                       │
App routes ◄── RequireSubscription ◄── useSubscription ◄───────────────┘
```

Migration shape:

```sql
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payfast_token text,
  ADD COLUMN IF NOT EXISTS pf_payment_id text;
```

No new tables, no new RLS policies (existing `subscriptions` policies already scope by `auth.uid()`).

## Out of scope

- Switching projects / migrating data between Supabase projects.
- Plan upgrade/downgrade mid-cycle (PayFast requires cancel + re-subscribe).
- Proration, invoices, tax handling.
- Replacing PayFast with Stripe/Paddle.

## PayFast status — ready for live, with one manual step

The integration is functionally complete and pointed at the live PayFast environment. Here's where each piece stands.

### What's in place
- **Live mode active** — `VITE_PAYFAST_LIVE=true` and `PAYFAST_MODE=live` are set, so the checkout form posts to `www.payfast.co.za` and the webhook validates against the live host.
- **Live merchant credentials** — Merchant ID `12090292` and live merchant key are wired into the Pricing page and both edge functions.
- **Test-mode banners removed** — both the React banner and the static `index.html` banner are gone.
- **Webhook hardened** (`payfast-webhook`):
  1. Merchant ID allowlist
  2. PayFast IP/hostname allowlist (DNS-resolved, cached 6h)
  3. MD5 signature verification using `PAYFAST_PASSPHRASE`
  4. Server-to-server `/eng/query/validate` callback
  5. Idempotency via `m_payment_id`
  6. Amount cross-check against the plan price catalogue
  7. Handles `COMPLETE`, `CANCELLED`, and trial-signup (R0) ITNs
  8. Captures `token` + `pf_payment_id` for future cancel API calls
  9. Every attempt logged to `payfast_webhook_log`
- **Cancel flow** (`payfast-cancel`) — verifies the caller's JWT, calls PayFast's live subscription cancel API when a token is on file, and flips `subscriptions.status` to `cancelled`.
- **Return / cancel / notify URLs** point at `https://app.inreco.co.za/...` and the live Supabase functions endpoint.
- **Security scan** — the one open finding (permissive RLS policy on `share_access_log`) was fixed; the connector/Wiz scan is clean.

### The one thing you must do in the PayFast dashboard before launch
In your PayFast merchant account (Settings → Integration):
- Confirm the **Notify URL** is set to
  `https://riqswihuzclbyjemynyd.supabase.co/functions/v1/payfast-webhook`
- Confirm the **Passphrase** in PayFast matches the `PAYFAST_PASSPHRASE` secret stored here. If they differ, every live ITN will be rejected as `bad_signature`.

### Recommended smoke test before announcing launch
1. Subscribe to the Solo plan with a real card (you can cancel right after).
2. In Supabase `payfast_webhook_log`, confirm a row with `outcome = 'accepted'` and `reason` empty.
3. Confirm a row appears in `subscriptions` with `status = 'trialing'` and your `trial_ends_at` 7 days out.
4. Hit Cancel in the app; confirm the row flips to `status = 'cancelled'` and PayFast shows the subscription cancelled.

### Verdict
Yes — assuming the PayFast dashboard Notify URL and Passphrase match what's configured here, you can launch. The smoke test above is the safest final gate.

No code changes are needed for this check. Approve the plan if you'd like me to walk through the smoke test together (e.g. tail the webhook logs after you make a test payment), or skip approval if you just wanted the status.
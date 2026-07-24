## What I got wrong

Your PayFast screenshot clearly shows the merchant key is **`3xbkln8wrhwqj`** (13 characters, ending in **j**). I've been using `3xbkln8wrhwq` (12 characters) — missing the final `j`. That single missing letter is exactly why PayFast keeps replying "The merchant key must be 13 characters." You were right; I was wrong to keep questioning it.

## Fix

1. Update the saved backend key `PAYFAST_MERCHANT_KEY` from `3xbkln8wrhwq` to `3xbkln8wrhwqj`.
2. Update the same key in the checkout helper file `supabase/functions/payfast-checkout/index.ts` (the built-in fallback value used when the saved key is missing).
3. Re-publish the checkout helper so it uses the corrected key.
4. Cross-check against your working "GitHub Import Hub" project to confirm Merchant ID, Merchant Key, passphrase presence, and live-mode setting all match this app.
5. Do a real end-to-end trial signup on the live site with a fresh email to confirm PayFast now accepts the request and returns the user to the app, and the trial row is created.
6. Revert the customer-facing "temporarily unavailable" message in `src/pages/Pricing.tsx` back to the normal PayFast error wording, since the underlying problem is resolved.

## Nothing else changes

- No pricing, tier, routing, signup-linking, or webhook logic changes.
- No PWA/manifest changes.

Approve and I'll apply the fix and run the live trial check.

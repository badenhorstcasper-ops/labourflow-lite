# Fix "Start 7-day free trial" buttons going back to landing

## Root cause
The landing page buttons navigate to `/pricing` via `window.location.href='/pricing'`. The SPA fallback serves `index.html`, but the legacy inline bootstrap in `index.html` only hands off to React for a small allow-list of paths. `/pricing` is not in that list, so the legacy landing page renders again — making it look like the button "links back to the landing page".

The same problem affects every React-only route except the ones already listed: `/auth`, `/contact`, `/payment-success`, `/payment-cancelled`, `/dashboard`, `/settings`.

## Fix

Two parallel allow-lists must stay in sync:

1. `src/main.tsx` — `REACT_ROUTES` controls whether `main.tsx` mounts React.
2. `index.html` — `window.__IS_REACT_ROUTE__` controls whether the legacy IIFE short-circuits so React can take over.

Add these routes to BOTH lists:
- `/pricing`
- `/auth`
- `/contact`
- `/payment-success`
- `/payment-cancelled`
- `/dashboard`
- `/settings`

`/` stays excluded — that's the legacy landing page and must continue to render the existing HTML.

## Changes

**`src/main.tsx` (line 21)**
Extend `REACT_ROUTES` to include the new paths (using exact match for the leaf ones and `startsWith` semantics already handled by the existing helper).

**`index.html` (line 834)**
Extend the `__IS_REACT_ROUTE__` expression with the same paths so the legacy bootstrap returns early and `main.tsx` replaces `document.body` with the React tree.

No backend, no router, no pricing-page logic changes. The existing PayFast form in `src/pages/Pricing.tsx` already works — it just never gets a chance to render on the live site today.

## Verification
After deploying, visiting `https://app.inreco.co.za/pricing` should show the React pricing grid (with the test-mode banner) instead of the marketing landing page, and clicking any "Start 7-day free trial" plan card should POST to `sandbox.payfast.co.za`.

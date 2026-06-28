# Plan: trial gating, installability, PayFast trial billing

## What I checked

**1. App is installable (PWA).** `public/manifest.json`, theme-color, apple-touch-icon, and `/sw.js` are all wired up in `index.html`. `InstallAppButton.tsx` prompts the browser's install dialog and falls back to clear iPhone/Android instructions. Verdict: installable on Android/desktop Chrome via the install button; on iPhone via Safari → Share → Add to Home Screen.

**2. PayFast is configured for "free trial first, charge later".** `src/pages/Pricing.tsx` posts to PayFast with `amount=0.00`, `subscription_type=1`, `billing_date = today + 7 days`, and `recurring_amount = plan price`. That is PayFast's correct pattern: the card is tokenised today (R0 authorisation), the first real debit happens on `billing_date`, and if the user cancels in the app before then, no money is taken. ✅ Correct — no change needed.

**3. Trial-day calculation has a gap.** `src/hooks/useSubscription.ts` returns `isEntitled = true` whenever `status === "trialing"`, regardless of `trial_ends_at`. If the first PayFast debit fails or the webhook is delayed, the user (and every invited team member, since the hook already resolves to the owner's subscription) keeps access past day 7. The trial-days countdown in `AppShell.tsx` is correct, but the gate is not.

**4. Team-member inheritance works.** `useSubscription` already looks up the active `team_members` row and reads the owner's subscription. So once the owner's `isEntitled` flips, every invited user is blocked by `RequireSubscription`. The only missing piece is the trial-expiry flip itself (see #3).

**5. Webhook handles CANCELLED but not FAILED.** `payfast-webhook` already flips `status` to `cancelled` on a CANCELLED ITN. It does not handle FAILED/past-due ITNs, which is what PayFast sends when the recurring debit bounces.

## Changes

### A. Client-side trial expiry (fixes the day-count gate)
**File: `src/hooks/useSubscription.ts`**
- Compute `trialExpired = status === "trialing" && trial_ends_at && new Date(trial_ends_at) < now`.
- Change `isEntitled` to: `status === "active" || (status === "trialing" && !trialExpired)`.
- `daysLeft` stays the same (already clamps at 0).

Effect: the moment the trial date passes, the owner AND every invited team member loses access and is bounced to `/pricing?reason=trial_ended` by `RequireSubscription`, even before PayFast's ITN arrives.

### B. Server-side past-due handling (closes the long-tail case)
**File: `supabase/functions/payfast-webhook/index.ts`**
- Add a branch: if `payment_status` is `FAILED` (PayFast's recurring-failure status), flip the matching subscription to `status = 'past_due'`, mirroring the existing CANCELLED branch (lookup by `payfast_token` first, then `user_id`).
- Update `useSubscription`: `past_due` is not entitled (handled implicitly by the new `isEntitled` rule since it only allows `active` / `trialing`).

### C. Pricing page reassurance copy (no logic change)
**File: `src/pages/Pricing.tsx`**
- Under each plan's CTA, tighten the existing fine-print line to: "Card secured today via PayFast. No charge during the 7-day trial. First debit of {price} on {billing_date} only if you don't cancel."

### D. Installability — small polish
**File: `src/pages/Pricing.tsx`** (and keep `PaymentSuccess.tsx` as-is, which already shows `InstallAppButton`)
- Drop the existing `InstallAppButton` into the Pricing page header so users can install before signing up. No new components, just reuse.

## Verification after build
1. Manually set a test subscription's `trial_ends_at` to yesterday → confirm owner and invited member both get redirected to `/pricing?reason=trial_ended`.
2. Open the published site on Android Chrome → tap Install → confirm a home-screen shortcut named "iNRECO" launches the app standalone.
3. Re-read `Pricing.tsx` to confirm the PayFast form fields (`amount=0`, `billing_date`, `recurring_amount`) are unchanged.

## What I am NOT changing
- PayFast form fields (already correct).
- Team-member resolution in `useSubscription` (already correct).
- Existing CANCELLED webhook branch.
- Manifest, service worker, or install button component.

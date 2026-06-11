# Fix dead-end after saving company profile

## Problem
After PayFast sandbox checkout, the user lands on `/account-app/profile`, fills in the form and clicks **Save profile**. The page just shows a toast — there's no forward navigation, and the only nav options are:
- `AppShell` header **Back** button → goes back to PayFast / landing
- `AppShell` header **Back to app** link → goes to `/`, which `Index.tsx` immediately redirects signed-in users back to `/account-app/profile` (an infinite loop on itself)
- Header nav has **Company profile** and **Documents**, but they look like tabs, not a "you're done, start here" call to action

So the user feels stranded.

## Fix

Two small, presentation-only changes:

### 1. `src/pages/CompanyProfile.tsx` — forward the user after first save
- After a successful `save()`:
  - Show the existing success toast.
  - If this was the **first** save (i.e. the profile was empty when the page loaded, tracked with a `wasNewProfile` ref/state set in the initial `useEffect`), navigate to `/account-app/documents` so they land in the actual working area of the app.
  - On subsequent saves (editing an existing profile) keep current behaviour — just the toast, no redirect — so editing your details later doesn't yank you away.
- Also add a visible **"Continue to documents →"** button next to **Save profile** / **Generate sample document** that always works, for users who already saved once and want an obvious way forward.

### 2. `src/components/AppShell.tsx` — fix the misleading "Back to app" link
- Change the header **Back to app** button so it links to `/account-app/documents` instead of `/`. On signed-in users `/` just bounces back to `/account-app/profile`, making the button look broken.
- Keep the **Back** (history) button as is.

No backend, routing, PayFast, or auth changes. No new routes. Pure UX wiring on pages that already exist and already render correctly on the live site.

## Verification
1. Sign in fresh, complete PayFast sandbox → land on `/account-app/profile`.
2. Fill company name + logo → click **Save profile** → toast appears and the app navigates to `/account-app/documents`.
3. Go back to `/account-app/profile`, change a field, save again → stays on the profile page (no surprise redirect), toast only.
4. From anywhere in `AppShell`, click **Back to app** in the header → lands on `/account-app/documents`, not back on the profile page.

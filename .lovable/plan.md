## What I confirmed by checking the live sites and the database

- **app.inreco.co.za** is the real, current app (it already shows R599).
- **inrecoapp.inreco.co.za** is a **completely different, stale copy** hosted on GitHub Pages, last updated 25 July, still showing **R499**. It is not the same site, which is why buttons behave differently. It is a separate project I cannot edit from here.
- **Landing page being skipped:** the landing page has a start-up rule that, if you are already signed in, throws you straight into the app. If that account has no plan, the app then bounces you to pricing with the "no subscription" note. That whole chain happens in under a second, so you never see the landing page.
- **Back/Home on the pricing page:** the Home button navigates "inside" the app to `/`, where React (not the landing page) takes over and immediately runs the same jump-into-the-app rule — so you bounce right back to pricing. Back does the same. That's the loop you hit.
- **The account you were signed in as tonight** (`info@inreco.co.za`, created at 19:26) genuinely has no plan, which is why pricing said "no subscription".
- **Sign-in:** the failed attempts logged tonight were simply password mismatches. Your Outlook owner account exists and already has full owner rights.
- **Devices:** the current rule gives every account a minimum of 2 devices — which matches what you want for Solo. What's missing is the hard stop and the clear message on the 3rd device, and blocking Solo from inviting other people.
- **Payments:** checkout is reaching PayFast (5 attempts recorded tonight, all left "pending"), so the failure is happening on PayFast's side, not in the app. That needs one live test to pin down.

## What I will do

**1. Landing page must always be the front door**
Remove the auto-jump. A signed-in visitor sees the normal landing page with a clear "Open the app" button. Only the installed phone app keeps going straight in.

**2. Fix Back and Home everywhere**
Home will do a genuine page load to the landing page instead of an internal jump, so it can never bounce back. Back will do the same when there's no sensible page to return to. I'll check this on pricing, auth, admin, partner and the "page not found" screen.

**3. Solo devices: 2 allowed, 3rd blocked with a clear message**
- Solo keeps exactly 2 devices (e.g. phone + laptop). Business 5, Professional 10, Enterprise 15. Owner/admin unlimited.
- Trying a 3rd device shows a plain message: "You've reached the 2 devices included in Solo. Remove a device under Account → Devices, or upgrade for more users." No silent sign-out.
- **Solo cannot invite other people at all.** The "Invite team member" option will be hidden and blocked on Solo, with a short line explaining team seats come with Business and above. This is enforced in the database too, so it can't be bypassed.

**4. Your owner passwords**
Set both `badenhorst.casper@gmail.com` and `casperbadenhorst77@outlook.com` to `Casper@771103`, then actually sign in with each in the preview and confirm.

**5. Make the two web addresses behave identically**
The cleanest fix is to **point inrecoapp.inreco.co.za at this same app** (add it as a second address for the live app), so both addresses serve exactly the same pages and buttons and there is no second copy to keep in sync. I'll give you dead-simple steps for the one change needed at your domain provider. If you'd rather keep the old GitHub copy alive, the alternative is a redirect file that sends every visitor from the old address to app.inreco.co.za — tell me which you prefer and I'll set it up.

**6. PayFast**
Run a real checkout from the server side and read back exactly what is being sent (merchant number, live-vs-test setting, whether a passphrase is attached, and the R0.00 first charge). The three usual causes of that error page are: test merchant details left in place, a passphrase that doesn't match the one saved in your PayFast account, or PayFast refusing a R0.00 first charge on a live account. Fix whichever it is, and tell you plainly if something must change inside your PayFast account.

**7. Then properly test — signed out, signed in, and on a phone-sized screen**
Landing → each pricing button → sign-up → payment → first sign-in → every app page → back/home on every page → 2-device limit → 3rd device blocked → Solo invite blocked. I'll report each as pass or fail with what I actually saw, not a summary.

## One question

For inrecoapp.inreco.co.za: point it at this same app (recommended), or leave the old page there and auto-redirect visitors to app.inreco.co.za?

## Technical notes

- Entry loop: `afterLogin()` in `index.html` sets `window.location.href = '/app'` on boot when a session exists; `/app` is wrapped in `RequireSubscription`, which redirects to `/pricing?reason=no_subscription`. `src/pages/Index.tsx` does the same for React-mounted `/`. Both get changed to stop auto-forwarding.
- `BackHomeBar` uses react-router `Link to="/"`, which never leaves the SPA; will switch to a hard `window.location.assign('/')`.
- Device rule lives in the `register_device` database function (`GREATEST(COALESCE(MIN(device_limit),2),2)`); will map limits per plan with Solo = 2 and keep the admin bypass, returning a friendly error code the UI shows as a message.
- Seat rule lives in `accept_team_invite` (Solo cap already 1) plus `invite-team-member`; the invite UI in `TeamManagement.tsx` will be gated on plan.
- PayFast diagnosis targets `supabase/functions/payfast-checkout/index.ts`: live/sandbox switch, merchant id/key, signature+passphrase construction, `amount: "0.00"` with `subscription_type: 1`.

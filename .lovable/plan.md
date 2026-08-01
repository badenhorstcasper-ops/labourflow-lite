## What's happening

**1. The jumbled "Start Free" page (second screenshot)**

The old-style page code (the file `index.html`, which is the public landing page) contains styling rules written for plain `header` and `h1` tags. Those rules apply to *every* page of the app, not just the landing page. Confirmed in that file:

- a rule that forces any `header` block into a side-by-side sticky bar
- a rule that blows any `h1` up to a huge size

The pricing page and 12 other app pages use plain `header` and `h1` tags, so the intro text gets squeezed into three side-by-side columns with a giant "Start Free" sitting on top of it. On a phone this looks broken; on desktop it mostly hides.

**2. "Unsafe app blocked" from Google Play Protect (first screenshot)**

This is not a bug in the app and nothing is unsafe. When someone adds the app to their home screen, some Android browsers (and older Android versions) build a small wrapper app on the phone, and Google warns about the wrapper because it was built for an older Android version. Chrome builds a current wrapper and does not show this warning. I cannot remove the warning from our side — but I can stop people hitting it and reassure them when they do.

## The fix

**Stop the old styling leaking into app pages**

Restrict the two offending rules in the landing page file so they only apply to the landing/old page itself (by scoping them to the old page's own container) instead of every `header` and `h1` on the site. Then check the pricing page and the other affected pages (Settings, Contact, Refer & Earn, Health, Partner pages, Legal pages, Share) on a phone-sized screen to confirm each one reads correctly.

**Make the "Start Free" page read well on a phone regardless**

Give the pricing intro a sensible width, spacing and heading size of its own, so it can never be pushed around by outside styling again.

**Improve the install experience on Android**

- On the install page and the install button: detect when someone is using a browser other than Chrome on Android and show a short line saying "For the smoothest install, open this page in Chrome" with a tap-to-copy of the address.
- Add one plain-language line under the install button explaining that if Android shows a Play Protect warning, they can tap "Install anyway" — or simply skip installing and use the app in the browser, which works exactly the same.
- Keep the existing behaviour where the app can just be used in the browser with no install at all.

## Verification before I hand back

I'll load the pricing page and the other affected pages at phone width, take screenshots, and confirm nothing overlaps and everything is readable, then re-check the install page wording.

## Technical detail

- `index.html`: scope the global `header { ... }` and `h1 { ... }` declarations (and the `@media (max-width:600px) header` rule) to the legacy shell container so they stop cascading into the React tree.
- `src/pages/Pricing.tsx`: add explicit `max-w`/`mx-auto`/text-size classes on the header block so it is self-contained.
- `src/pages/GetApp.tsx` and `src/components/InstallAppButton.tsx`: add non-Chrome-Android detection and the Play Protect explainer copy.
- Verify with Playwright at 390x844 across the affected routes.

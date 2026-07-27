## What I'll fix

### 1. Top bar not lining up (live site)
On the app pages the menu row sits in its own scrolling strip, so on wide screens it slides to the right and the iNRECO logo/Back/Home get pushed out of view (that's what your screenshot shows). I'll make the menu wrap onto a second line instead of sliding, and keep the left side (Back, Home, iNRECO) locked in place and aligned with the page content below it.

### 2. The official app icon
Use the artwork you attached as the one true app icon everywhere: the installed shortcut (all sizes, including the rounded "maskable" version phones use), the browser tab icon, the iPhone home-screen icon, and the picture that shows up when a link is shared.

### 3. "Install the app" on the landing page
Add the one-tap install button in three sensible spots on the home page: in the top hero area, next to the pricing block, and in the footer. On iPhone it shows the two short steps instead (Apple gives no install button). If the app is already installed, the buttons quietly disappear.

### 4. Share the app with friends
Add a "Share iNRECO" button next to each install button and inside the app (so subscribers can pass it on). Tapping it opens the phone's normal share sheet (WhatsApp, SMS, email) with a short message and a special link, e.g. `app.inreco.co.za/get`. On a computer it copies the link and confirms.

New public page at `/get`:
- Shows the icon, one-line description, and a big Install button.
- Anyone opening it who is not a paying subscriber is sent straight to the plan choices (pay now or start the free trial) — exactly as you asked.
- If the person who shared has a partner/referral code, it rides along on the link so they get credit.

Also: when the installed app is opened by someone with no plan, it goes straight to the plan chooser instead of bouncing around.

### 5. WhatsApp / link previews
Add the missing social preview details to the home page and `/get`: title, one-line description and the icon image, so any link shared on WhatsApp shows the logo and a proper card. (Right now there are none, so shares look blank.)

### 6. Two buttons on every plan: "Start 7-day free trial" and "Join now"
On both the landing page plan cards and the `/pricing` page each paid plan gets two clear buttons:
- **Start 7-day free trial** — nothing charged today, first charge in 7 days (what happens now).
- **Join now & pay** — charged today and the monthly billing starts immediately.

The checkout service is updated to accept which of the two the person picked and to set the amount and first billing date accordingly, with the plan name and price recorded the same way as today so the partner commission tracking still works.

### 7. Whole-app layout and ease-of-use pass
I'll walk the real live pages (home, plans, sign-in, CARA, dashboard, documents, generate, verify sick note, profile, billing, partner and admin pages) on both phone and desktop sizes, and report back a short list of anything cluttered, confusing, cut off or dead-ending — with the small, safe fixes applied (consistent page widths, working Back/Home everywhere, clear next-step buttons). Anything bigger I'll list as a suggestion for you to approve rather than change on my own.

## Technical notes
- `src/components/AppShell.tsx`: replace the horizontally scrolling `nav` with a wrapping flex row; align header container to the same `max-w-7xl` as `main`.
- Add attached artwork via `lovable-assets` and regenerate `public/icon-192.png`, `icon-512.png`, `icon-maskable-{192,512}.png`, `favicon.png`; keep `public/manifest.json` pointing at them.
- New `src/components/ShareAppButton.tsx` using `navigator.share` with clipboard fallback; new public route `/get` (`src/pages/GetApp.tsx`) added to `src/App.tsx`/`src/main.tsx` route allowlist, redirecting non-entitled visitors to `/pricing`.
- Add `og:title/description/image/url`, `twitter:card=summary_large_image` to `index.html` head (absolute `https://app.inreco.co.za/icon-512.png`).
- `supabase/functions/payfast-checkout/index.ts`: accept `mode: "trial" | "now"`; for `now` set `amount` to the plan price and `billing_date` to today; keep signature logic unchanged. Redeploy to live.
- Verify with Playwright against the live domain plus a Lighthouse-style installability check.

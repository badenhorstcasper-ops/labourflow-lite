# Install-first app experience

Goal: make iNRECO feel like an app you download from a store — install first, explore a little, sign up only when needed, pay only when the free week ends. Nothing already built or published is removed.

## What already works (confirmed)
- The free week already needs no card. Signing up switches the trial on and the person lands in the app.
- An install button, install hint card and a shareable install page already exist.
- The phone shortcut settings (name, icon, colours, full-screen mode) are already correct.
- People whose week has ended are already sent to the plan page, and they keep their account — no second sign-up.

## What is missing
1. Opening the installed shortcut always shows the marketing home page, even for someone already signed in.
2. The install invitation only appears in a few places, not through the whole journey.
3. A first-time visitor cannot try anything at all — every app screen bounces them to sign-in.
4. Nothing a guest types before signing up is kept.

## The changes

### 1. Smart launch for the installed app
When the shortcut is opened (full-screen mode), skip the marketing page and decide instantly:
- not signed in → sign-up / sign-in screen
- signed in, free week or paid plan active → straight into the app
- free week finished → plan screen with "Pick a plan to carry on"
- plan lapsed → plan screen with renewal wording
A short branded loading screen shows while this is decided, so it feels like an app opening.

### 2. Install invitations everywhere
One reusable install prompt placed in: the landing hero, the sticky top bar, after the feature sections, just above pricing, on the pricing page, on the sign-up screen, in the app's More menu, and on a "you're in — add it to your phone" step right after registration. It is hidden automatically once the app is installed.
Tapping it opens the phone's own install prompt where supported; on iPhone (and any browser without that prompt) it shows the short "Share → Add to Home Screen" steps instead. It never sends anyone to an app store.

### 3. Guest try-before-you-sign-up
A guest can open the CARA screen and ask one question, and can browse the document list. Anything further shows a friendly "Create your free account to continue" card instead of a hard bounce. All other protected screens keep their current protection exactly as-is.

### 4. Nothing lost at sign-up
A guest's question (and the plan they tapped) is kept on their own device and replayed into the app the moment their account exists, so it feels like the sign-up never interrupted them.

### 5. Registration stays short
The sign-up form keeps only email, password and the legal tick, plus an optional name. Company details, logo and the rest stay where they are — asked later, only when first needed. No payment details at sign-up.

### 6. Wording pass
Check every "no card needed" line against what actually happens and correct anything inaccurate: free week genuinely needs no card, payment details are only asked when the week ends or a plan is bought immediately. Renewal screens say "renew", not "sign up".

## Technical notes
- New `src/lib/appLaunch.ts` (standalone/`?app=1` detection) and a `LaunchRouter` used on `/` in `src/main.tsx`, so the legacy marketing page still owns `/` for normal browser visits.
- New `src/components/InstallCta.tsx` wrapping existing `pwaInstall.ts` helpers; reused in `index.html` (a small mount point), `Pricing.tsx`, `Auth.tsx`, `AppShell.tsx` More sheet, and a post-signup step.
- `RequireSubscription` gains an optional `allowGuestPreview` flag used only by `/app`; all other routes unchanged.
- Guest draft stored in `localStorage` (`inreco.guestDraft`), consumed once on first authenticated load of `/app`.
- No database, payment or edge-function changes.

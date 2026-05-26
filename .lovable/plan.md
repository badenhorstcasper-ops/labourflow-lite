## Goal

After a user signs up or selects any pricing tier, prompt them to install the iNRECO PWA shortcut on their device. Use the existing `public/favicon.png` (the new app icon) as the install icon.

The project already ships PWA basics — `public/manifest.json`, a minimal `public/sw.js`, and `<link rel="manifest">` in `index.html` — but nothing registers the service worker or surfaces an install button to the user.

## Changes

### 1. `public/manifest.json`
Switch the icon entries from `/logo.png` to `/favicon.png` (per your "same picture as the favicon" instruction). Keep both 192×192 and 512×512 entries pointing to the same file with `purpose: "any maskable"`. No other manifest fields change.

### 2. `index.html` — service worker registration + install prompt
The legacy single-page app lives in `index.html`. Add a small `<script>` block (near the bottom, alongside the existing auth code) that:

a. **Registers `/sw.js`** on production hosts only — skip when running inside an iframe or on Lovable preview hosts (`id-preview--`, `lovableproject.com`). This is required so Chrome/Edge will fire `beforeinstallprompt`.

b. **Captures `beforeinstallprompt`**, calls `e.preventDefault()`, and stashes the event in a module-level variable `deferredPrompt`. Listens for `appinstalled` to clear it and set `localStorage["inreco.pwaInstalled"] = "1"`.

c. **Exposes `window.promptInstall()`** which:
   - If `deferredPrompt` exists → calls `.prompt()`, awaits the choice, clears the variable.
   - Else if the device is iOS Safari → shows a small modal with "Tap Share, then Add to Home Screen" plus the favicon image.
   - Else if already installed (`display-mode: standalone` or `localStorage` flag) → no-op.
   - Else → shows a generic "Open your browser menu → Install app / Add to Home Screen" modal.

d. **Adds a lightweight modal** (`<div id="installModal">`) with the favicon, a short message ("Install iNRECO on your device for one-tap access"), an "Install" button bound to `promptInstall()`, and a "Not now" button. Styled to match the existing screen styles (semantic classes already in the file).

e. **Triggers the modal**:
   - In `doSignup` immediately after `await afterLogin()` when `data.session` exists, and after `setTimeout(..., 1800)` for the email-confirm path → set a `localStorage` flag so the modal appears on next `afterLogin`.
   - In `afterLogin()` after `enterApp()` if the `pendingInstallPrompt` flag is set.
   - On the pricing screen — wrap each "Get <Tier>" submit handler so that just before navigating to PayFast, we set `localStorage["inreco.pendingInstallPrompt"] = "1"`. The modal then surfaces when the user returns to the app after payment.
   - Suppress if `localStorage["inreco.pwaInstalled"]` is `"1"` or `display-mode: standalone` already matches.

### 3. `src/pages/PaymentSuccess.tsx` (React payment-success route)
Replace the static "Tip: on your phone, use your browser's Add to Home Screen" paragraph with an actual **Install iNRECO** button:
- New small component `InstallAppButton` (placed inline in the file or in `src/components/InstallAppButton.tsx`).
- Uses the same `beforeinstallprompt` capture pattern, the same iOS/Safari fallback modal (built with existing shadcn `Dialog`), and the favicon (`/favicon.png`) as the visual.
- Hidden when already installed.

### 4. `src/pages/Pricing.tsx`
In the existing PayFast `onSubmit` handler (and on the Free-tier `Get Started Free` link click), set `localStorage["inreco.pendingInstallPrompt"] = "1"` so the legacy app surfaces the modal after they return / sign in.

No backend, schema, auth-config, or PayFast-field changes. No new dependencies — uses the existing manifest + `sw.js` infrastructure and shadcn `Dialog`.

## Notes for you

- The install prompt only appears on browsers that support PWA install (Chrome, Edge, Samsung Internet, Android Firefox, desktop Chrome/Edge). On iOS Safari there is no programmatic prompt — the modal will instead show the standard "Share → Add to Home Screen" instructions with the favicon visual. This is the platform limit, not something we can bypass.
- The install prompt and SW registration are suppressed inside the Lovable editor preview iframe, so you'll only see it working on the published `app.inreco.co.za` site or on a phone.

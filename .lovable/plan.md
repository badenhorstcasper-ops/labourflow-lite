## Why no prompt today

`public/manifest.json` exists and `index.html` links it, but the app has no service worker and no install-prompt UI. Chrome/Edge on Android only fire the "Add to Home Screen" prompt when the page has a manifest **and** a registered service worker with a fetch handler. iOS Safari never auto-prompts — the user must tap Share → Add to Home Screen, so we need a small instructional banner.

Important caveat: install prompts will only work on the **published** site (https://app.inreco.co.za) over HTTPS, not inside the Lovable editor preview iframe.

## What I'll add

1. **Minimal service worker** at `public/sw.js`
   - Empty `fetch` handler (required for install criteria), no caching → avoids the stale-content problems called out in Lovable's PWA guidance.
   - `skipWaiting` + `clients.claim` so updates roll out cleanly.

2. **Guarded SW registration** in `src/main.tsx` (or `index.html` inline script — whichever matches the current entry)
   - Register only when:
     - `'serviceWorker' in navigator`
     - NOT inside an iframe (`window.self === window.top`)
     - NOT on a Lovable preview host (`id-preview--…lovable.app` / `lovableproject.com`)
   - This protects the editor preview from caching/navigation issues.

3. **Install prompt UI** — a small dismissible banner / floating button
   - Listen for `beforeinstallprompt`, stash the event, show an "Install iNRECO" button. On click → `prompt()` → record outcome.
   - Hide automatically when `display-mode: standalone` is already active or after the user dismisses (persist dismissal in `localStorage`).
   - **iOS fallback**: when `navigator.standalone === false` and UA is iOS Safari, show a one-time banner: "Tap Share, then 'Add to Home Screen' to install iNRECO." with the share icon.
   - Styling matches the existing dark navy theme already used in `index.html` (no new design tokens).

4. **Manifest polish** (`public/manifest.json`)
   - Confirm `start_url: "/"`, `display: "standalone"`, `theme_color`, `background_color`, `name`, `short_name` — already present.
   - Add `"purpose": "any maskable"` to the icon entries so Android renders a proper home-screen icon.
   - Add a 512x512 icon entry pointing to `/logo.png` (already declared) — verify the file is actually 512px+; if not, flag it.

5. **No changes** to navigation, routing, styling system, PayFast flow, or existing copy.

## Files touched

- `public/sw.js` (new)
- `public/manifest.json` (icon purpose field)
- `index.html` **or** `src/main.tsx` — add guarded SW registration + mount the install banner. I'll pick whichever already owns app bootstrap after a quick read.
- One small component for the banner (kept inline in `index.html` if the app is the static single-file shell, otherwise a tiny React component).

## What the user will see after deploy

- **Android Chrome**: native "Install app" prompt appears, plus our in-app "Install iNRECO" button as a backup.
- **iOS Safari**: instructional banner with Share → Add to Home Screen steps.
- **Desktop Chrome/Edge**: install icon in the address bar + our in-app button.
- **Lovable editor preview**: nothing changes (SW disabled there) — testing must happen on the published URL.

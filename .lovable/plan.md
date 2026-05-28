# Improve signup button + info text contrast

The "Create Account" button (`#su-btn`) and info line (`#su-info`) sit on the dark navy gradient background of the signup screen. Currently `.btn` uses `var(--primary)` (#2563eb) with white text, and `.auth-info` uses `var(--success)` green at 13px — both blend into the dark background until hovered.

## Changes (index.html only — scoped to the signup screen)

1. **`#su-btn` — make it pop**
   - Inline style override on the button:
     - `background:#ffffff`
     - `color:#0a1f44` (navy, for strong contrast)
     - `font-weight:800`
     - `font-size:16px`
     - `box-shadow:0 4px 14px rgba(0,0,0,0.35)`
   - Keeps the existing `.btn` width/padding/radius. Hover state inherits from `.btn:hover` but we'll add an inline `onmouseover/onmouseout` is not needed — the white background already reads clearly at rest.

2. **`#su-info` — make status messages legible**
   - Inline style override:
     - `color:#ffffff`
     - `font-weight:700`
     - `font-size:14px`

3. No JS, no other screens, no token changes — the global `.btn` and `.auth-info` rules stay intact so the rest of the app is untouched. Only the two selected elements on the signup screen get the contrast boost.

## Technical notes
- Edits are limited to the two element tags at lines 630–631 of `index.html`.
- Tailwind/design tokens in `src/index.css` are not used by `index.html`, so the change stays in the static HTML where the elements live.

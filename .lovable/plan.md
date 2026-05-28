## Goal
Find and fix all places where text is hard to read because of poor contrast — light text on light backgrounds, or dark text on dark backgrounds — across both the legacy `index.html` marketing/app shell and the React app pages.

## Scope
Two surfaces:
1. **`index.html`** — landing, pricing, signup, login, onboarding, chat, plans panel (hand-written CSS, lots of hardcoded `#fff` / `var(--primary)` combinations).
2. **React app** (`src/pages/*`, `src/components/*`) — Auth, Dashboard, Pricing, Contact, Share, Settings, CompanyProfile, Documents, AppShell, TeamManagement.

## Approach

### 1. Sweep for contrast offenders
For each page/section, check:
- Light text (`#fff`, `text-white`, `text-slate-50`, `text-muted-foreground`) sitting on a light background.
- Dark text (`#000`, default `text-foreground`, `text-slate-800`) sitting on a dark/colored background (e.g. `bg-primary`, `bg-slate-500`, gradient banners).
- Placeholder / muted text using opacity that drops below WCAG AA.
- Buttons where label color matches button background.

### 2. Fix rules
- **React components**: replace hardcoded Tailwind colors with semantic pairs from the design system — `bg-primary` + `text-primary-foreground`, `bg-secondary` + `text-secondary-foreground`, `bg-muted` + `text-foreground`, etc. No `text-white` / `text-black` / `text-slate-*` / `text-gray-*` in components.
- **`index.html`**: keep its existing CSS-var system but make sure every colored background has an explicit, high-contrast text color declared on the same rule. Where buttons currently render light-on-light (the recent `btn bg-slate-500 text-slate-50` edits), restore a confidently dark button (`var(--primary)` bg, `#fff` text) so it stands out on the light card.
- Drop the ad‑hoc inline `style="color:#fff;font-weight:700"` patches added during earlier debugging once the underlying class is correct.

### 3. Verify
- Open each route in the preview at the current viewport, screenshot, and visually confirm every heading, body line, label, helper text, button, badge, and link is legible.
- Re-check the signup / login / onboarding / chat flows specifically, since those have been the recurring trouble spots.

## Pages I will inspect and fix

```text
index.html
  - landing hero + nav CTA
  - pricing cards (.plan, .price-card, .btn-price)
  - signup screen (#su-info, #su-btn and inline-styled patches)
  - login screen
  - onboarding screen (#ob-btn)
  - chat screen (.bubble, .send-btn, .avatar.bot)
  - plans panel inside app

src/pages/Auth.tsx           - card + Google button + muted helper text
src/pages/Dashboard.tsx      - nav buttons on #fcfbf8
src/pages/Pricing.tsx
src/pages/Contact.tsx
src/pages/Share.tsx          - public doc, custom accent colors
src/pages/Settings.tsx
src/pages/CompanyProfile.tsx - logo preview on bg-white
src/pages/Documents.tsx
src/components/AppShell.tsx  - active vs inactive nav link contrast
src/components/TeamManagement.tsx
```

## Out of scope
- Visual redesign, spacing, typography changes.
- shadcn primitive internals (Dialog/Sheet/Drawer overlays at `bg-black/80` are intentional).
- Backend / data logic.

## Deliverable
One pass of targeted edits per file above, then a short summary of what changed per page.

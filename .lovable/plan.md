## What's wrong now

The landing site (`app.inreco.co.za/`) uses a dark navy / blue brand (`#0a1f44` → `#0f172a` background, `#2563eb` primary, light text). The account-app pages (`/account-app/profile`, `/account-app/documents`) render with the default light shadcn theme, so they come out white with black text — that's why "the rest of the app is blue but these pages are suddenly white".

In that white header:
- The inactive nav tab is black on white, and on the active blue pill the text contrast reads as "black on blue".
- The small outline "Back to app" button blends in and is easy to miss.
- After saving the Company Profile there is no clear, obvious link that says "now go and start using the app" — only a small secondary "Continue to documents →" button mixed in with Save.

## Fix

Pure visual / shell changes. No backend, no routing, no auth.

### 1. Re-skin the React app to match the landing's navy + blue brand
Update the light-mode tokens in `src/index.css` so every account-app page (profile, documents, share, settings, dashboard, etc.) inherits the same palette as the landing:

- `--background` → navy `#0f172a`
- `--foreground` → near-white `#f1f5f9`
- `--card` / `--popover` → surface `#1e293b`
- `--muted` → `#273449`, `--muted-foreground` → `#94a3b8`
- `--border` / `--input` → `#334155`
- `--primary` → blue `#2563eb`, `--primary-foreground` → white
- `--secondary` / `--accent` → `#273449` with light foreground
- `--ring` → `#3b82f6`
- Keep `--destructive` red.

All values written as HSL per the existing token convention. No component code changes needed — shadcn components and the existing `bg-background` / `text-foreground` classes will instantly match the landing.

### 2. Fix the header in `src/components/AppShell.tsx`
- Inactive nav links: change to `text-muted-foreground hover:text-foreground hover:bg-muted` so they're legible against the navy header.
- Active nav link: blue pill with white text (already correct after the token change — just verify).
- Replace the small outline "Back to app" button with a prominent **primary** button labelled **"Open app →"** that links to `/account-app/documents`, so it's the obvious call to action and impossible to miss.
- Keep the "Back" (history) button as a subtle ghost style that stays visible on navy.

### 3. Make "start using the app" obvious on Company Profile
In `src/pages/CompanyProfile.tsx`:
- Promote the existing "Continue to documents →" button to a **large primary "Start using the app →"** button, placed on its own line below the Save row so it's the clear next step.
- After a successful save show a small inline confirmation panel at the top of the page with the same **"Start using the app →"** button (in addition to the toast) so the user always has a one-click way forward without scrolling.
- Both buttons navigate to `/account-app/documents` (the main working area).

### 4. Quick visual check
After the changes, load `/account-app/profile` and `/account-app/documents` in the preview and confirm:
- Background matches the landing's navy.
- Both "Company profile" and "Documents" tabs are readable in active and inactive states.
- The "Open app →" button in the header is obvious.
- After saving the Company Profile, the "Start using the app →" button is clearly visible.

## Out of scope
- No changes to the landing page (`index.html`).
- No changes to PayFast, auth, or any data.
- Dark-mode tokens left untouched.

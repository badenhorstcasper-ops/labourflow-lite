# Move welcome + company setup into signup, open on CARA

## What changes for the user

1. **New "Set up your company" step right after signup**
   - After someone creates an account (or starts the free trial), they see one friendly screen: "Welcome to iNRECO" with a short company setup (company name, logo, address, contact).
   - Two buttons: **Save and continue** and **Skip for now**.
   - Either choice takes them straight to CARA. They only see this step once.
   - Guests who asked CARA a question before signing up still get their question answered automatically after this step.

2. **App always opens on CARA**
   - Signing in, opening the installed app, or tapping the logo lands on CARA (already mostly true; this makes it consistent).
   - If the person skipped company setup, CARA keeps its existing small reminder ("Add your company details so documents carry your branding").

3. **Home tab becomes a clean workspace, not a welcome page**
   - Remove the big "Welcome, ..." heading and the "Company profile" and "System health" cards from Home.
   - Home keeps what's useful day to day: Create a document, My documents, Recent documents, Quick-start templates, and plan status shown as a small line.
   - Sign out moves off Home (it already lives in the More menu).
   - Company profile stays reachable from the More menu as "Company details", so it can be edited any time.

4. **Mobile-first** layout kept: single column on phones, 56px buttons, bottom navigation unchanged.

## Technical details

- New page `src/pages/Onboarding.tsx` at `/welcome`, reusing the company profile save logic (upsert into `company_profiles`); "Skip" stores a per-user flag (localStorage `inreco.onboarding.done.<userId>`) so it never shows again; saving also counts as done. Existing users with a company name are treated as done.
- `src/pages/Auth.tsx` and trial start: after signup, route to `/welcome` (preserving any saved deep link / guest draft redirect), then `/welcome` forwards to `/app` or the saved destination.
- `src/pages/CompanyProfile.tsx`: drop first-time redirect logic now handled by onboarding; keep as an editing page.
- `src/pages/Dashboard.tsx`: remove welcome hero, sign-out button, company profile and system health cards; keep remaining sections. Admin "System health" stays in admin pages.
- `src/components/AppShell.tsx` More sheet: ensure "Company details" link exists.
- Verify at 390x844: signup → welcome → skip → CARA; signup → save → CARA; Home tab layout; existing user sign-in goes straight to CARA.

## Goal
Get iNRECO ready to launch — close the two functional gaps blocking real use, verify every flow works end‑to‑end with your test account, then publish.

## What's blocking launch today
1. **No way to actually generate documents.** `src/lib/documents/generateDocument` exists, but the only place that calls it is a "Generate sample" button on Company profile. Users can't pick a template (warning, contract, etc.).
2. **`/dashboard` is a placeholder** ("Your app will live here"). All the "Open app" / "Start using the app" buttons now land on a blank page.
3. **`/` redirects logged‑in users to `/account-app/profile`** instead of an app hub.

## Plan

### 1. Build a real `/dashboard` hub (`src/pages/Dashboard.tsx`)
A logged‑in landing page inside `AppShell` showing:
- Greeting + current plan/status (from `subscriptions`)
- **Profile completeness** card — banner + "Complete your company profile" CTA if `company_profiles.company_name` is empty
- **Quick actions**: Generate document, View documents, Edit company profile, Manage subscription
- **Recent documents** (latest 5 from `generated_documents`) with PDF/DOCX/Copy‑link buttons
- Link to Health, Settings, Contact in footer of the card grid

If not signed in → redirect to `/auth`.

### 2. Build the document generator (`src/pages/Generate.tsx`, route `/account-app/generate`)
Template picker for the core HR document types iNRECO needs at launch:
- Written warning (verbal/written/final variants)
- Employment contract
- Dismissal letter
- Performance improvement plan (PIP)
- Leave approval / refusal letter
- Confidentiality / NDA

Each template = a small form (recipient name, dates, reason, custom paragraphs) → builds a `DocumentTemplate` (existing type) → calls `generateDocument()` → on success shows PDF/DOCX download buttons + share link, and a "View all documents" link.

New file: `src/lib/documents/templates/index.ts` exporting the six template builders so the same definitions can be reused later (server, email, etc.).

### 3. Wire navigation correctly
- `src/pages/Index.tsx`: signed‑in → `/dashboard`, signed‑out → `/` static landing (keep current `/pricing` fallback if no landing route exists — confirm by reading the router).
- `src/pages/Auth.tsx` (3 redirects on lines 29, 57, 63, 99): all → `/dashboard`.
- `src/pages/CompanyProfile.tsx`: "Start using the app" buttons → `/dashboard` (already done in last turn — verify).
- `src/components/AppShell.tsx`: "Open app" header button → `/dashboard`. Add "Generate" tab to the section nav alongside Documents / Profile / Health.
- Register `/account-app/generate` and confirm `/dashboard` route in `src/App.tsx`.

### 4. End‑to‑end verification in the preview browser
Using `casper@inreco.co.za` / `Casper@771103`:
1. Static landing → `/pricing` → pick a plan → PayFast **sandbox** → complete payment → `/payment-success` → verify `subscriptions` row updated.
2. Sign out, sign in, wrong password, forgot password → `/reset-password` flow loads.
3. `/dashboard` renders with plan + completeness + recents.
4. Company profile: edit name + upload logo + save → toast + confirmation panel → "Start using the app" → lands on `/dashboard`.
5. Generate: pick each of the six templates, fill the form, generate → PDF + DOCX download with iNRECO branding and user's company branding → share link opens `/d/:token` in incognito tab → revoke link → confirm 410/blocked.
6. Documents list: download, copy link, revoke, delete all work.
7. Settings: subscription shows + cancel works.
8. `/account-app/health`, `/contact`, `/terms`, `/privacy`, `/disclaimer` render with no console errors.

Each step: capture pass/fail. Fix bugs found inline before moving on. Report at the end.

### 5. Pre‑publish hygiene
- Run security scan; address criticals (or surface them) before publishing.
- Verify SEO basics on `index.html`: iNRECO title, meta description, OG/Twitter tags, favicon.
- Confirm no references to "Labourflow" or "iNRECO Consulting" anywhere in code or generated docs.

### 6. Publish
Publish to `app.inreco.co.za`.

## Out of scope
- Redesign of marketing landing or pricing page copy.
- New backend tables/RLS changes (existing schema already supports all of the above).
- Team invites UX changes, additional auth providers, new payment provider, or new languages.
- Adding more than the six launch templates (more can be added later via `templates/index.ts`).

## Technical notes
- All templates go through `generateDocument()` per project memory — shared house style + user branding.
- No schema changes needed: `generated_documents`, `company_profiles`, `subscriptions`, `next_document_number` RPC all already exist.
- Storage bucket `documents` is private with signed URLs — keep as is.
- New routes are client‑only React Router routes; no hosting config needed.

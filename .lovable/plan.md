## What's happening

When the document modal warns "Add your company details…" the link points to `/account-app/profile` and opens in a new tab (`target="_blank"`). That new tab tries to mount the React app at a different route:

- On the **preview** URL, the new tab goes through Lovable's auth-bridge first and loses the legacy app's auth session — the React Company Profile page renders without an authenticated user (or stays blank waiting on auth).
- On the **published** site, even when the route loads, the user has to leave the wizard, fill out a long form, come back to the chat, regenerate the document, and try Word/PDF again. That's the "blank page" they're seeing.

Root cause: we ask the user to leave the document modal to fix a small data gap, in a flow that breaks across tabs.

## Fix

Solve it where the problem appears — inside the document modal — and keep `/account-app/profile` as the full editor for later.

### 1. Inline "Company details" panel in the document modal (`index.html`)

Replace the yellow warning's link with a **"Complete now"** button that expands a compact form right inside the modal:

- Company name *
- Address (single line) 
- Contact email
- Contact phone  
- Signatory name + title
- Logo upload (optional, drag-drop file input → uploads to `company-logos/<owner>/logo.<ext>` exactly like `CompanyProfile.tsx` already does)
- Accent colour (colour picker, defaults `#2563eb`)

A **Save & continue** button upserts to `company_profiles` (same shape `CompanyProfile.tsx` writes), hides the panel, and immediately retries the PDF/Word download the user just clicked.

Only "Company name" is required; everything else is optional but recommended. Pre-fill any fields the row already has so the panel doubles as a quick edit.

### 2. Same-tab fallback link

Keep an "Open full company profile" link under the panel for users who want the larger editor, but change it to `target="_self"` so it doesn't spawn a broken new tab. Wizard state is non-critical; they can re-open the chip.

### 3. Reuse, don't duplicate

- Use the existing `supabase` client already imported in `index.html`.
- Use the same `company-logos` storage bucket and `company_profiles` upsert pattern as `src/pages/CompanyProfile.tsx`.
- After save, refresh the cached `companyBrand` object so `window.iNRECO.generatePdf` / `generateDocx` (already loaded via `src/lib/documents/clientEntry.ts`) picks it up on the retry.

### 4. Mobile

Panel is a single-column form inside the existing `.wizard` modal — already responsive. No layout changes needed.

## Out of scope

- React `/account-app/profile` page itself — no changes; it still works for power users.
- Auth, document rendering, brand-name guard, DEV_PAID list — all unchanged.
- No DB migration, no new tables, no edge functions.

## Files touched

```text
index.html   replace .brand-warn block with inline company-details panel,
             add save handler, retry the pending PDF/Word action on success
```

That's it — one file.

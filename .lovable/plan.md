## What's wrong today

When you click **PDF** or **Word** on a generated document, the app throws `company_profile_incomplete` unless you've already saved a company profile. That pops a yellow "Add your company details" form that, in practice, behaves as if **logo and colour are required** — and any storage hiccup while uploading the logo blocks the whole save.

There are also no Back buttons on `/account-app/profile`, `/account-app/documents`, `/account-app/health`, or `/contact`, so once you're in a settings page the only way out is the browser back arrow.

## What I'll change

### 1. Documents generate even without a company profile
- `src/lib/documents/index.ts` and `src/lib/documents/clientEntry.ts`: stop throwing `company_profile_incomplete`. If no profile exists, use safe fallbacks (Company name = the signed-in user's email or just blank header, no logo, default accent `#2563eb`).
- The PDF/Word will still be produced — just without branded letterhead. A small non-blocking toast says: *"Tip: add your company details to brand future documents"* with a link to the profile page.

### 2. Logo and accent colour become truly optional, with no error gates
- **In-app profile page** (`src/pages/CompanyProfile.tsx`):
  - Re-label the Branding section "Branding (optional)".
  - Add a "Use default colour" / "Remove logo" button so a user can blank either field.
  - Move logo upload errors to inline warnings — the rest of the profile still saves even if logo upload to the `company-logos` bucket fails.
  - Show a clearer error toast (currently the raw Postgres message) and validate `company_name` client-side before submitting.
- **Inline brand form inside the document modal** (`index.html`, around lines 1457–1581):
  - Remove the asterisk on company name in cases where the user just wants to skip; offer a **"Skip and download anyway"** button next to "Save & continue" that immediately runs the PDF/Word with defaults.
  - Make the logo file input and the colour picker explicitly labelled "(optional)".
  - If the logo upload fails, save the rest and continue with the download — don't block.

### 3. Back buttons everywhere
- `src/components/AppShell.tsx`: add a left-aligned **← Back** button (uses `navigate(-1)`; falls back to `/`). Appears on every page that uses AppShell (Profile, Documents, Health, Contact).
- `src/pages/Share.tsx`, `src/pages/Terms.tsx`, `src/pages/Privacy.tsx`, `src/pages/Disclaimer.tsx`: add the same Back link at the top.
- In `index.html`'s document modal the existing "← Back to chat" stays; I'll make sure the brand sub-form's **Cancel** clearly returns you to the document view (not just hides the inline form silently) and that the brand warning has a visible **Dismiss** button so it's clear the form is optional.

### 4. Small polish
- Profile page: success/failure toasts get plain-English wording ("Saved — your branding will appear on all new documents." / "We couldn't upload that logo file. The rest of your profile was saved.").
- Document modal: when downloads succeed without a profile, show "Downloaded. Branding can be added in *Account → Company profile*."

## Out of scope
- No changes to the database, RLS, or storage buckets.
- No changes to the security dashboard or the e-mail flow.
- No redesign of the wizard itself — only the brand prompt and the buttons around it.

## Files I expect to touch
- `src/lib/documents/index.ts`
- `src/lib/documents/clientEntry.ts`
- `src/pages/CompanyProfile.tsx`
- `src/components/AppShell.tsx`
- `src/pages/Share.tsx`, `src/pages/Terms.tsx`, `src/pages/Privacy.tsx`, `src/pages/Disclaimer.tsx` (Back link only)
- `index.html` (the inline brand form + a "Skip and download" button)

After implementing, I'll generate a sample PDF without a profile to confirm it no longer errors, then test saving a profile with no logo.

## Why the regression happened

The doc generation in `index.html` (`generateDocument`, line 1420) just asks the AI to "output the document as it should appear on company letterhead" and downloads the raw AI reply as `.txt`. There is no real letterhead, no company branding, and no PDF/DOCX renderer — so the AI invents a header, sometimes "LABOURFLOW — POWERED BY iNRECO CONSULTING". The React document system under `src/lib/documents/` (renderPdf, renderDocx, company_profiles) was built for this exact purpose but is not wired into the in-app wizard.

## What the fix does

1. **Kill the invented letterhead in the AI output.** Change the prompt so the AI returns only the BODY of the document (subject + body + signature placeholder) — no header block, no "Powered by" line, no company name guess. Add an explicit instruction never to use "Labourflow", "iNRECO Consulting", or any made-up letterhead.

2. **Load the user's real company profile on login.** In `index.html`, after auth, fetch the `company_profiles` row for the account owner (already exists, populated from `/account-app/profile`). Cache it as `companyBrand` alongside `currentProfile`.

3. **Show a "Complete company details" banner** in the document modal when the profile is empty. Button opens `/account-app/profile` in a new tab so they can fill in name, address, contact, logo, accent colour.

4. **Edit before download.** Replace the read-only doc preview with an editable `<textarea>` (Markdown-friendly). The user can tweak every line of the warning before generating the file.

5. **Real PDF / Word downloads using the existing renderer.** Replace the "⬇️ Download" button with two buttons: **"⬇️ PDF"** and **"⬇️ Word"**. Both routes go through the shared house-style layout in `src/lib/documents/` so every employer's docs look consistent:
   - Header: their logo (left), their company name + reg/VAT + doc number + date (right), accent rule
   - Body: the edited text the user just approved
   - Signatures: signatory name/title from profile + Employee
   - Footer: their address · email · phone · website · page numbers
   
   Implementation: bundle a tiny `src/lib/documents/clientEntry.ts` that exposes `window.iNRECO.generatePdf(text, title)` and `window.iNRECO.generateDocx(text, title)`. The legacy `index.html` calls those. The AI text is split into the body blocks (paragraphs + simple bullet detection) and fed to the existing `renderPdf` / `renderDocx`.

6. **Brand-name guard.** Before rendering, strip any line matching `/labourflow|inreco consulting|powered by/i` from the edited text as a safety net.

7. **Memory unchanged.** `mem://constraints/forbidden-brand-names` and the existing `brand.test.ts` already forbid these strings in templates — this fix extends the same rule to runtime AI output.

## Out of scope

- Subscription / PayFast / dev-paid changes (handled in the previous turn).
- Wizard question flow (already restored).
- Any new document type — same wizard topics, same `currentMatter.docs` list.

## Files touched

```text
index.html                          edit generateDocument(), showDocumentModal(), load companyBrand, add PDF/Word buttons
src/lib/documents/clientEntry.ts    new — exposes window.iNRECO.generatePdf/generateDocx using existing renderPdf/renderDocx
src/main.tsx                        import clientEntry so the helpers are available globally on every page
src/lib/documents/renderPdf.ts      no logic change — confirm it never prints PLATFORM_NAME in the header/footer (it already only prints company.company_name)
src/lib/documents/renderDocx.ts     same check
```

No DB migration, no new tables, no edge function changes. The `company_profiles`, `generated_documents`, `documents` bucket and share-link flow stay exactly as they are.

# Document generation: branding, formats, sharing

## Goal

Every document the app produces must:
1. Carry only the **iNRECO** brand for the platform itself, and otherwise be branded with the **subscriber's own company details** (logo, name, address, registration, contact). Never reference "Labourflow" or "iNRECO Consulting".
2. **Share a single, consistent house style** across every document type, so anything coming out of one employer's account visibly belongs to the same employer.
3. Be downloadable as **PDF** (always) and **DOCX** (where the document is something a user might edit before sending — warnings, contracts, notices).
4. Be **shareable via a private link** in addition to direct download.

## 1. Company profile (user-supplied branding)

New `company_profiles` table, one row per account owner:

- company_name, trading_name
- registration_number, vat_number
- address_line1, address_line2, city, postal_code, country
- contact_email, contact_phone, website
- logo_url (uploaded to a public `company-logos` storage bucket)
- accent_color (single hex, default iNRECO blue) — drives header bar, rule lines, heading colour
- signatory_name, signatory_title (optional, for the signature block)

RLS: owner can read/write their own row; team members can read their owner's row (via existing `team_members` link).

New **Settings → Company Profile** page where the subscriber fills this in and uploads a logo. If incomplete, generators show "Complete your company profile first" instead of producing a half-branded document.

## 2. Shared document template (the "house style")

A single layout used by **every** generated document, so all of one employer's documents look like they came from the same office:

```text
+-----------------------------------------------------------+
| [logo]   COMPANY NAME                    Doc #: ABC-001   |
|          trading name · reg / VAT        Date: 2026-05-26 |
|---------------------------------------------------------- |  <- accent rule
|                                                           |
|   DOCUMENT TITLE (e.g. "Written Warning")                 |
|   Subtitle / recipient line                               |
|                                                           |
|   [ body — provided by the per-doc template ]             |
|                                                           |
|                                                           |
|   _______________________   _______________________       |
|   Signatory                 Employee                      |
|                                                           |
|---------------------------------------------------------- |
| company address · email · phone · website   Page 1 of N   |
+-----------------------------------------------------------+
```

Fixed across every doc type:
- Same header (logo left, company block right, accent rule).
- Same typography scale (one heading font, one body font, fixed sizes).
- Same margins, accent colour, signature-block layout, footer with address/contact and page numbers.
- Same metadata strip (document number, generation date, recipient).

Per-doc templates only supply: the **title**, the **body content**, and which signature blocks to show. They cannot override chrome — that's how consistency is enforced.

Implemented as `src/lib/documents/`:
- `layout.ts` — the shared chrome (header, footer, signature block) for both PDF and DOCX.
- `renderPdf(template, data, company)` — `pdf-lib`, applies chrome then renders body.
- `renderDocx(template, data, company)` — `docx` package, mirrors the same chrome so Word output matches the PDF.
- `templates/` — one file per document type (added per feature). Each exports `{ title, body, signatures }` only.
- Constant `PLATFORM_NAME = "iNRECO"`; unit test asserts no template file contains "Labourflow" or "iNRECO Consulting" (case-insensitive).

## 3. Storage + shareable links

New `generated_documents` table:

- owner_user_id, created_by_user_id
- doc_type, title, doc_number (auto-incremented per owner)
- pdf_path, docx_path (private `documents` bucket, keyed `{owner_user_id}/{doc_id}/`)
- share_token (random unique), share_expires_at (default 30 days)

Flow on generate:
1. Render PDF (and DOCX if template supports it) through the shared layout.
2. Upload to private `documents` bucket.
3. Insert `generated_documents` row with fresh `share_token`.
4. Show result panel: **Download PDF**, **Download DOCX**, **Copy share link** → `https://app.inreco.co.za/d/{share_token}`.

New public `/d/:token` route + edge function `get-shared-document`:
- Validates token + expiry, returns short-lived signed URLs for the files.
- Page shows company logo, title, Download PDF / DOCX buttons. No login required.
- Owner can revoke from a new **Settings → Documents** page (list, download, copy link, revoke).

## 4. UI touchpoints (this iteration)

- **Settings → Company Profile** (form + logo upload + accent colour).
- **Settings → Documents** (list, download, copy link, revoke).
- Public **/d/:token** share page.
- Shared **`<DocumentResult />`** component so every future generator drops in and gets the same download + share UX.

No actual document *types* are added here — those come per feature (warning letter, contract, payslip) and must use the shared layout.

## Out of scope

- Specific document templates (added per feature later).
- E-signature, view tracking, password-protected links.
- Email delivery of share links (user copies/shares manually for now).

## Technical notes

- Libraries: `pdf-lib` (PDF) and `docx` (DOCX). Both run client-side.
- Storage: `company-logos` (public read), `documents` (private; access only via signed URLs minted by the edge function using the service role).
- Share-token lookup goes through the edge function so RLS on `generated_documents` stays strict (owner-only).
- Memory rule already in place: `mem://constraints/forbidden-brand-names`; the unit test in step 2 enforces it in code.

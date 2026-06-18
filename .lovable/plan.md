## Goal
After the user generates a **Notice of Disciplinary Hearing**, offer iNRECO's online chairperson service (R2,500 incl. chairing + outcome drafting, via Teams or Google Meet). If they want it, a **Book a Hearing** dialog collects their details and 3 preferred date/times, and emails the request to `info@inreco.co.za`. Payment is handled manually by iNRECO afterwards — no PayFast involvement.

## Where it appears
Only on the Generate page's success state, immediately after a document of type `disciplinary_hearing_notice` (the existing hearing-notice template key) is generated. Nowhere else — no dashboard tile, no CARA chat entry, no banner on other templates.

## UX flow
1. User generates a hearing notice as today.
2. Below the existing PDF/DOCX/Share actions, a new card appears:
   - Title: **Need a chairperson for this hearing?**
   - Body: "iNRECO can chair the hearing online (Teams or Google Meet) and draft the outcome for you. Flat fee R2,500 — invoiced after the hearing is scheduled."
   - Primary button: **Book a Hearing**
   - Secondary link: "No thanks"
3. Clicking **Book a Hearing** opens a dialog (`BookHearingDialog`) with the form below. Company profile + employee name from the just-generated notice are pre-filled.
4. On submit: insert a row into `chairperson_bookings`, then call edge function `request-chairperson` which emails iNRECO. Toast confirms: "Request sent — iNRECO will contact you within 1 business day."

## Booking form fields
- Employer / contact name (pre-filled from profile, editable)
- Contact email (pre-filled from auth user, editable)
- Contact phone
- Employee name (pre-filled from notice)
- Preferred platform: Teams / Google Meet / No preference
- **Three preferred date+time slots** (date picker + time, all required) — copy: "We'll try to fit as close as possible to these; otherwise we'll contact you directly."
- Optional notes / brief summary (textarea, max 1000 chars)
- Linked document: hidden, set to the generated notice's id so iNRECO email includes a share link to the notice PDF

Zod validation on both client and edge function. All fields trimmed; email validated; 3 distinct future date/times required.

## Email to iNRECO
Sent via Lovable Emails (`send-transactional-email`) from the verified iNRECO sender, To: `info@inreco.co.za`, Reply-To: the user's contact email. Plain, branded template containing:
- Employer name, email, phone
- Employee name
- Preferred platform
- 3 preferred date/time slots
- Notes
- Link to the hearing notice (signed share link from `generated_documents.share_token`)
- Booking id

If Lovable Emails isn't yet provisioned for this project the plan triggers the standard email-domain setup dialog before deploying the function.

## Data model
New table `public.chairperson_bookings`:
- `user_id` (auth user, owner)
- `account_owner_id` (from `current_account_owner` rpc, for team scoping consistency with other tables)
- `document_id` (fk → `generated_documents.id`, nullable on delete set null)
- `employer_name`, `contact_email`, `contact_phone`
- `employee_name`
- `preferred_platform` (`teams` | `meet` | `any`)
- `preferred_slots` (`jsonb` — array of 3 ISO timestamps)
- `notes` (text, nullable)
- `status` (`requested` | `scheduled` | `completed` | `cancelled`, default `requested`)
- standard `id`, `created_at`, `updated_at`

RLS: owner (and account owner) can SELECT/INSERT their own rows; UPDATE/DELETE restricted to owner; service_role full access for the edge function. GRANT block included in the same migration.

## Files
**New**
- `supabase/migrations/<ts>_chairperson_bookings.sql` — table + grants + RLS + updated_at trigger
- `supabase/functions/request-chairperson/index.ts` — auth-checked, Zod-validated, inserts row (service role) and sends email
- `src/components/ChairpersonOffer.tsx` — the "Need a chairperson?" card
- `src/components/BookHearingDialog.tsx` — the booking form dialog

**Edited**
- `src/pages/Generate.tsx` — after a successful generation, if the template key is the hearing-notice one, render `<ChairpersonOffer documentId={…} employeeName={…} />` in the success area.

No changes to PayFast, CARA, Dashboard, or any other template flow.

## Out of scope
- Payment collection (manual invoicing by iNRECO).
- Admin UI for iNRECO to manage bookings (rows are visible in the backend; can be added later).
- Calendar integration / auto-creating Teams/Meet links.

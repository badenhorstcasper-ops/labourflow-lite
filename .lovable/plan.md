## Goal

Add a new module that helps HR verify whether a sick note is from a real, registered practitioner, guides them to the official verification sites, records the outcome, and generates procedurally-fair next steps (including draft disciplinary charges when the check fails).

## What the user will see

**New menu item "Verify Sick Note"** in the app's top navigation, available to the account owner and any active team member on the account.

**Landing screen** at `/account-app/verify-certificate` with two tabs:
- **New check** — start a verification
- **History** — list of past checks on this account (read-only rows, newest first, filterable by employee name and outcome)

### New check flow (single scrolling page, 3 steps)

**Step 1 — POPIA notice + capture form**

Short notice at the top: "This information is processed solely to verify the validity of the certificate and, where necessary, for disciplinary proceedings, in line with the company's POPIA policy and data retention schedule."

Only the fields actually needed to check the practitioner against the registers are compulsory. Everything else is optional so small employers or someone standing on the shop floor can still capture a check. Fields marked **required** show a red asterisk; the rest are plain.

- Employee name — **required**
- Employee number — optional
- Dates of incapacity (from / to) — optional
- Date certificate issued — optional
- Date submitted to employer — optional
- Practitioner full name — **required**
- Practitioner registration / practice number as printed — **required**
- Professional category — **required** (dropdown: Medical Practitioner, Dentist, Psychologist, Physiotherapist, Chiropractor, Homeopath, Nurse, Other allied health — "Other allied health" pushes AHPCSA to the top of the verification buttons)
- Practice name — optional
- Practice address — optional
- Practice phone — optional
- Reason for check — optional (dropdown: Routine spot-check, Suspicious absence pattern, Follows a disciplinary/warning event, Certificate appears altered, Other)
- Certificate upload (image or PDF, up to 10 MB) — optional

"Save & continue" is enabled as soon as the four required fields are filled.

**Step 2 — Guided verification**

Instruction line: "These open the official verification portals in a new tab. Search using the practitioner's name and/or number as printed on the certificate, then record what you find below."

Three external buttons (new tab, `rel="noopener noreferrer"`, do not affect app route):
- Check HPCSA iRegister → https://hpcsaonline.custhelp.com/app/i_reg_form
- Check PCNS Practice Number → https://www.pcns.co.za/Search/Verify
- Check AHPCSA Register → https://ahpcsa.co.za/practitioners/

Results form (all optional except at least one status must be picked before continuing):
- HPCSA/AHPCSA registration status found (dropdown: Verified / Active, Verified but Suspended / Inactive, Name found but number does not match, No match found, Could not complete check)
- PCNS practice number status (same dropdown)
- Notes (free text)
- Timestamp + username auto-captured (shown, not editable)

**Step 3 — Outcome + guidance**

Auto-classified:
- **Verified** — both statuses "Verified / Active"
- **Inconclusive** — any "Could not complete check" without a hard mismatch
- **Discrepancy / Suspected Fraud** — any "No match found", "number does not match", or "Suspended / Inactive"

Each outcome shows the exact guidance text from the original spec. Only the Discrepancy outcome shows the **"Generate Suggested Charges"** button, which opens a panel with the primary charge, alternative charge, disclaimer, and Procedural Fairness Checklist, with Copy and Download-as-.docx (via the existing `generateDocument` house-style layout so it carries the company logo and branding).

Once the outcome is saved the record is locked — no edits, only new timestamped notes can be appended.

## Data & security

New private storage bucket `medical-certificates` (owner-scoped, signed URLs, 30-min expiry).

New tables:
- `medical_cert_verifications` — one row per check. Optional fields stored as nullable; the four compulsory ones (employee name, practitioner name, practice number, category) are NOT NULL. Also holds file path, both status results, computed outcome, created_by, account_owner_id, locked_at.
- `medical_cert_audit_events` — append-only log of every action (created, results saved, outcome computed, note appended, charges generated, file viewed) with actor, timestamp, action, and a JSON snapshot.

Access rules (RLS):
- Only the account owner and their active team members can read/insert rows on their own account.
- After `locked_at` is set, a trigger blocks any update to the main row; only new rows in `medical_cert_audit_events` may be added.
- Storage bucket policies mirror the same account-scoping.

## Files to add / change

- `src/pages/VerifyCertificate.tsx` — full flow (list + new check tabs)
- `src/lib/verifyCertificate/outcome.ts` — pure classifier
- `src/lib/verifyCertificate/charges.ts` — builds charge-sheet + checklist text
- `src/lib/documents/templates/medicalCertCharges.ts` — new house-style template for the .docx download
- `src/App.tsx` — add gated route `/account-app/verify-certificate`
- `src/components/AppShell.tsx` — add "Verify Sick Note" nav link
- `src/pages/Cara.tsx` — small chip under the Discipline area linking to the module
- One migration: tables, GRANTs, RLS, immutability trigger, audit-insert trigger
- One `supabase--storage_create_bucket` call for `medical-certificates` + follow-up RLS migration on `storage.objects`

## Testing before handing back

- Walk a dummy entry through Verified, Inconclusive, and Discrepancy — confirm correct guidance appears and Generate Charges only shows on Discrepancy.
- Confirm the four required fields are the only blockers to Save & continue; leaving optional fields blank still works.
- Confirm the three external links open in a new tab and the app stays put.
- Confirm a signed-out user cannot reach the route and a team member of another account cannot see this account's records.
- Confirm locked records cannot be edited (UI disabled + DB trigger rejects).
- Confirm the audit log lists every step with actor + timestamp and cannot be edited.
- Confirm the POPIA notice is visible before any field can be filled.

I'll report a short summary of what was tested and anything odd before handing back.

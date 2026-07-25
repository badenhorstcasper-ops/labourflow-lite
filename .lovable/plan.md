## Goal

Give the owner/admin a page to manage marketing materials for partners, and give partners a place to submit their own materials for approval — with an option to share approved submissions with other partners.

## What gets built

### 1. Admin: Marketing Library page (`/admin/marketing`)
New page, admin-only, linked from the AppShell "Owner" area and from the existing Admin dashboard.

Two sections:

**a) Official assets** (uploaded by admin, visible to every approved partner)
- Uploads to the existing private `partner-marketing` bucket under `official/`.
- Supports images, videos, PDFs, and short text notes (a text note is stored as a small `.txt` file so it downloads like any other asset).
- Table of current assets with rename, replace, delete, and a copy-signed-link button.

**b) Partner submissions review queue**
- Lists every submission with: partner name + referral code, file preview, submitted date, whether the partner opted to share it, and an approval status (pending / approved / rejected).
- Actions: Approve, Reject (with optional short reason), and Delete.
- On Approve: if the partner opted to share, the file becomes visible to all approved partners in the shared library; otherwise it stays visible only to that partner.

### 2. Partner: Marketing page updates (`/partner/marketing`)
Three tabs on the existing page:

- **Official kit** — current behaviour (download official assets).
- **Community kit** — approved submissions from other partners that were opted-in for sharing.
- **My submissions** — the partner's own uploads with status badge (Pending / Approved / Rejected + reason) and a delete button while pending.

Add an "Upload my own material" button that opens a dialog with:
- File picker (image / video / PDF, up to 25 MB) OR a plain-text message field for text-only ads.
- Short title + optional description.
- Checkbox: "Allow other approved partners to use this material once approved by iNRECO admin" (default off).
- A reminder that all self-created adverts must be approved before use, per the Partner Agreement.

### 3. Data + storage
- New table `partner_marketing_submissions` (id, salesperson_id, title, description, storage_path, mime_type, size, share_with_partners bool, status enum pending/approved/rejected, reject_reason, created_at, decided_at, decided_by).
- Reuse the existing private `partner-marketing` bucket with folder layout:
  - `official/…` — admin-uploaded assets
  - `submissions/<salesperson_id>/…` — partner uploads
- Storage RLS on `storage.objects`:
  - Admin: full read/write on the whole bucket (already exists).
  - Approved partner: read own `submissions/<own_id>/…` at any status; read `official/…`; read other partners' `submissions/…` only when the matching row is `approved` AND `share_with_partners = true`; write to their own `submissions/<own_id>/…`.
- Table RLS:
  - Partner can insert/select/delete own pending rows.
  - Approved partners can select approved+shared rows from others (title, description, path only).
  - Admin full access.
- All downloads continue to use short-lived signed URLs (no public bucket).

### 4. Navigation + polish
- AppShell (admin view): add "Marketing" link next to Owner / Partners / Admin.
- Admin dashboard: add a "Marketing library" card linking to `/admin/marketing`.
- Partner portal: unchanged link to `/partner/marketing`, now surfaces the three tabs.

## Technical notes

- Files touched:
  - New: `src/pages/AdminMarketing.tsx`, `supabase/migrations/<new>.sql`.
  - Edit: `src/App.tsx` (route), `src/components/AppShell.tsx` (admin link), `src/pages/Admin.tsx` (card link), `src/pages/PartnerMarketing.tsx` (tabs + upload dialog + submissions list).
- No new edge functions required — uploads and status changes go through the Supabase client using RLS-guarded tables and storage policies.
- Video previews use a native `<video controls>` element with the signed URL; images use `<img>`.
- Size cap enforced client-side (25 MB) and by a storage policy check on `metadata->>'size'`.
- Text-only ads are stored as `submission-<uuid>.txt` so the same download/preview flow works for everything.

## Verification after build

- Sign in as admin → upload an image, a short video, and a text note to Official → confirm each appears in the Partner "Official kit" tab after signing in as an approved partner (test account).
- As partner → upload one file with "Allow sharing" ON and one with it OFF → both show in "My submissions" as Pending.
- Back as admin → approve both → the shared one appears in "Community kit" for a second approved-partner test account; the private one does not.
- Reject a submission with a reason → partner sees the reason in "My submissions".
- Confirm no file is ever served via a public URL (all downloads go through `createSignedUrl`).

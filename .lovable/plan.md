## What's wrong

The Delete button removes the row on screen, then the list refreshes and the document comes back — because the delete never actually happened in the database.

Confirmed cause: the access rules on the documents table (and on the file storage area) allow **only the account owner** to delete or revoke. Team members — including your second (Outlook) login, which is a team member of the owner account — are silently blocked: the database accepts the request but changes zero rows and reports no error. The page then reloads and the document reappears.

The same silent failure applies to **Revoke** (also owner-only) and to deleting the actual PDF/Word files in storage.

## The fix

1. **Access rules (database + file storage)**
   - Allow active team members of the account, and admins, to delete and revoke documents belonging to their account — not just the owner.
   - Match the file-storage rules so the PDF/Word files are actually removed too, not left behind.

2. **Documents page behaviour** (`src/pages/Documents.tsx`)
   - Ask the database to confirm what it actually changed on delete and revoke. If nothing changed, show a plain-language message ("You don't have permission to delete this document — ask the account owner") instead of pretending it worked.
   - Remove the row from the list immediately on a confirmed delete, and put it back only if the request failed. No more flicker-and-return.
   - Report storage-cleanup problems instead of ignoring them.
   - Replace the browser `confirm()` pop-ups with the app's own confirmation dialog so it looks and behaves like the rest of the app.

3. **End-to-end check of the whole documents flow**
   - Generate a document (filled and blank template), confirm it appears with a number.
   - Download PDF and Word from the list.
   - Copy the share link and open it signed-out — confirm it loads with the logo.
   - Revoke, then re-open the share link — confirm it says the link was revoked.
   - Delete, refresh the page — confirm it stays gone and the files are removed.
   - Repeat the key steps signed in as a team member.

## Technical notes

- New policies on `public.generated_documents` for DELETE/UPDATE using the existing `is_account_member(owner_user_id, auth.uid())` helper plus `has_role(auth.uid(),'admin')`; keep the owner policies.
- Matching `storage.objects` DELETE policy for bucket `documents` scoped by first path segment = account owner id, allowing active team members.
- Client: `.delete().eq('id', id).select('id')` / `.update({revoked_at}).eq('id',id).select('id')` and branch on empty result; optimistic list update with rollback.
- Verification runs against the live preview with a real signed-in session (owner and team member).

Two small security fixes the scanner flagged. Both are "warn" level, neither changes how the app looks or feels for you or your users.

## 1. Make the company logos folder private

Right now, anyone who guesses or is handed a logo's web address can open it directly — even people who never signed in. That's the warning. We'll switch the logos folder to "private" and have the app hand out short-lived viewing links (good for one hour) whenever a logo needs to be shown.

What changes behind the scenes:
- The logos storage folder is flipped from public to private.
- The Company Profile page asks for a fresh viewing link each time it shows your logo.
- The shared-document link page (the page your staff/clients see when you send them a document link) also asks for a fresh viewing link for the logo.
- The document maker (the part that builds PDFs and Word files) already downloads the logo into the document itself, so once a document is generated nothing breaks.

What you'll notice: nothing visible. Logos still appear where they did before.

## 2. Stop showing invite tokens to invited people

An "invite token" is the secret code inside a team invitation link. Today, once someone joins your team, they can still see their own invite code in the team list — which means it could be copied, forwarded, or reused.

Fix: invited team members will no longer be able to see the invite code column at all. Only you (the account owner) will. The invite acceptance flow already replaces the code with a new random one the moment someone joins, so this just closes the door fully.

What you'll notice: nothing. The invite links you already sent keep working.

## Wrap-up

After the two fixes are in place, I'll mark both warnings as fixed in the security scanner.

## Technical details (for reference)

- Flip the `company-logos` storage bucket to `public = false` and update its storage policies so only the owner can read/write inside their own folder.
- Replace `getPublicUrl` in `src/pages/CompanyProfile.tsx` with `createSignedUrl` (1h TTL) and refresh on upload/remove.
- Extend `get-shared-document` edge function to sign the `company_profiles.logo_url` (or derive a path) and return a signed URL the share page can render.
- `renderPdf.ts` / `renderDocx.ts` already embed bytes at generation time; keep as-is but switch the fetch URL to a signed URL produced just-in-time.
- Revoke column-level `SELECT` on `team_members.invite_token` from the `authenticated` role; keep service_role and add a `WITH GRANT` to the owner via the existing policy by splitting member vs owner SELECT or using a column grant approach. Then `manage_security_finding` → `mark_as_fixed` for both `company_logos_public_bucket_no_select_all` and `team_members_invite_token_exposure`.

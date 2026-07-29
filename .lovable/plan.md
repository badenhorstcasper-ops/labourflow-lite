## What's actually wrong

I checked the live database, and this is confirmed, not a guess.

The Company Profile page saves everything (details **and** logo) under the **account owner's** ID. But the permission rules on the database and on the logo storage area only allow you to save under **your own** ID. For anyone who is a team member on someone else's account, those two IDs are different — so the upload is rejected and the details save fails too.

This hits you directly: your `casperbadenhorst77@outlook.com` account is recorded as an active team member of your `badenhorst.casper@gmail.com` account. So when you're signed in with the outlook address, the app tries to save the logo into the gmail account's folder, and the rules block it. Same for saving company details.

## The fix

1. **Logo storage rules** — allow uploading, replacing, reading and deleting a logo when you are either the account owner *or* an active team member of that account (this is exactly the pattern already used successfully for the sick-note files, so it's proven in this app).
2. **Company details rules** — allow an active team member to save/update the account's company details, not just the owner.
3. **Page-side safety net** — if the logo upload is refused, show a plain-language message ("You don't have permission to change this account's logo") instead of a raw technical error, and never let a failed logo block the rest of the details from saving.
4. **Small correctness fix** — when the logo file type changes (e.g. from PNG to JPG), remove the old file so two logos don't linger in storage.

## End-to-end check afterwards

I'll run through the whole client-details flow in the running app and confirm each step really works:
- Sign in, open Company profile, load existing details
- Upload a logo (PNG/JPG/WEBP), see the preview appear
- Save the profile, reload the page, confirm details and logo persist
- Remove the logo, save, confirm it's gone
- Generate a sample document and confirm the logo and company details appear in the PDF and Word versions
- Repeat the key steps as a team member account, which is the case that's currently broken

## Technical notes

- Root cause: `CompanyProfile.tsx` writes with `owner_user_id = current_account_owner()`, while `storage.objects` policies for `company-logos` (INSERT/UPDATE/DELETE) and `public.company_profiles` (INSERT/UPDATE) all gate on `auth.uid() = owner_user_id`. Only SELECT has a team-member branch.
- Migration will rewrite those policies to use the existing `public.is_account_member(_owner, _user)` security-definer helper, matching the `medical-certificates` bucket policies.
- No schema/table changes; policy changes only, plus small UI error-handling edits in `src/pages/CompanyProfile.tsx`.

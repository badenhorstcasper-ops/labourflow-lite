## What's wrong right now

1. **The reset link logs you straight in instead of asking for a new password.** The email link lands on the general app address, so the app treats it as a normal sign-in and jumps to the dashboard. The "Set a new password" screen never gets a chance to show.
2. **Emails say "LabourFlow Lite".** That name isn't anywhere in the app's files — it's the *project name* stored on the Lovable side, which the built-in sign-up/reset emails use as the sender name.
3. **PayFast shows "iNRECO Solo Plan – 7-day free trial"** rather than the trading name you want.

## What I'll do

**1. Make the reset link always ask for a new password**
- Send the reset email to the dedicated "Set a new password" page and make that page the only landing spot, so a recovery link can never drop someone into the dashboard.
- On that page, block all navigation until a new password is actually saved, then send the person to the app.
- Make the same page work when the link opens on a phone in a different browser.

**2. Set your password on both of your email addresses**
- `badenhorst.casper@gmail.com` and `casperbadenhorst77@outlook.com` both get the password you gave me, with the Outlook one created (already confirmed) if it doesn't exist yet.
- Both keep full owner/admin access.
- I'll do this with a small, locked, one-time admin task that only I can trigger, and remove it straight afterwards so nobody else can ever use it.
- Note in plain words: you typed the password in chat, so it's worth changing it later from inside the app once you're in.

**3. Fix the names**
- PayFast will show **iNRECO Pocket Consultant – <plan> (7-day free trial)** on the payment page, the bank statement line and the receipt.
- For the emails: the "LabourFlow Lite" name comes from the project title in Lovable, which I can't rename from here. I'll give you a 3-step, dead-simple instruction to rename the project to **iNRECO** (Settings → project name → save), which changes every future email immediately. Everything inside the app already says iNRECO / CARA.

**4. Check it works**
- Send myself a reset link, confirm it opens the "Set a new password" screen and refuses to continue until a new password is typed.
- Sign in on the preview with both of your addresses and confirm owner/admin pages open.
- Start a PayFast checkout and confirm the new name appears.

## Technical notes

- `src/pages/Auth.tsx`: `resetPasswordForEmail` redirect stays `/reset-password`; add recovery-token handling and guard.
- `src/pages/ResetPassword.tsx`: detect `type=recovery` in the hash/query, exchange the code, prevent auto-redirect elsewhere, force `updateUser({ password })` before navigation.
- `src/App.tsx` / `src/main.tsx`: ensure `/reset-password` is in the React-owned route list so the live domain serves it.
- Passwords set via a temporary service-role edge function using the Auth admin API (`updateUserById` / `createUser` with `email_confirm: true`), guarded by `CRON_SECRET`, deleted after one run.
- `supabase/functions/payfast-checkout/index.ts`: `item_name` → `iNRECO Pocket Consultant - <plan>`, `item_description` updated to match.

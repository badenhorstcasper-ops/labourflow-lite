# When something breaks — what to do

This guide is written for **you** (the iNRECO owner), not a developer. Follow these steps before stressing.

## 1. Anything looks broken on screen
1. Reload the page.
2. If you see a screen that says **"Something went wrong"**, click **Copy for Lovable**, open Lovable chat, paste, and send. That's it.

## 2. You see an error toast / red message
1. Go to **/account-app/health** (only you can see this page).
2. Find the matching error at the top.
3. Click **Copy for Lovable** next to it.
4. Paste into Lovable chat. Send.

## 3. A user emailed/WhatsApped you about a bug
1. Open **/account-app/health**.
2. Scroll to **User reports** — their message is there with timestamp, page they were on, and any error attached.
3. Click **Copy for Lovable** on the related error (if any), then add the user's words.

## 4. PayFast payment didn't activate a plan
- PayFast hits a webhook automatically. If a user paid but isn't upgraded:
  - Ask Lovable: *"Please check the payfast_webhook_log for email <their email>"*.
  - Lovable will see the row and tell you whether it was accepted, rejected, or never arrived.

## 5. Document won't generate (PDF/Word)
- 99% of the time this means the **Company profile is incomplete**. Open `/account-app/profile` and fill in company name, address, signatory.
- The app shows a banner with a link when this is the cause.

## 6. The app is completely down
- Check the green/red dots on **/account-app/health** → Backend status.
- If "Database" is red, message Lovable: *"Database is down on iNRECO — please check Lovable Cloud status."*

## 7. Security questions / concerns
- See `SECURITY.md` for what's protected.
- If you ever suspect a data leak, change your password immediately and message Lovable.

## The magic phrase
For almost anything, this works:
> **"Please fix error <ID> on iNRECO"** — paste the ID from the Health page.

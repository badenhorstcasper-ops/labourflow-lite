# Make every share link on the restaurant page point to the restaurant page

## Problem

On `https://app.inreco.co.za/restaurants`, most share links (WhatsApp, copy-link, share sheet) should send friends to the restaurant page — but several still point to the generic `/get` page or the plain homepage.

Root cause, confirmed in `index.html`:

- The industry share fix-up (rewrites WhatsApp/email/copy links to the industry URL) runs in a script at line ~640 **while the page is still parsing**. Links that appear later in the page (the WhatsApp button around line 958, the contact section, and any modal) are never rewritten, so they keep the hardcoded `https://app.inreco.co.za/get` address.
- `APP_URL` (line 2545) is computed once as a fixed value. It works only if the industry script happened to run first — fragile ordering.

## Fix (all inside `index.html`, affects `/restaurants` and `/supermarkets`)

1. **Run the share-link rewrite after the page has fully loaded** (`DOMContentLoaded`), so every WhatsApp, email, and copy-link element on the page is rewritten to the industry URL — no matter where it sits in the page.
2. **Make the shared link lazy**: replace the one-time `APP_URL` constant with a small function that reads the current industry path at the moment someone taps share, so the install/share modal, QR code, and advice-share links always use `/restaurants` when on that page.
3. **Keep the referral tag**: share links keep the `?ref=` referral code when one is stored, so referrals still count.
4. Supermarkets page gets the same behaviour automatically (same shared code).

## What does not change

- The main homepage (`/`) keeps sharing the generic `/get` link — only industry pages share their own address.
- Document share links (the paid app's generated-document sharing) are untouched.
- No visual changes.

## Verification

- Load `/restaurants` in the preview, click every share control (hero WhatsApp chip, mid-page WhatsApp button, "Share iNRECO with a friend", share modal) and confirm each produces a link to `https://app.inreco.co.za/restaurants`.
- Repeat on `/supermarkets` and on `/` (should still share `/get`).

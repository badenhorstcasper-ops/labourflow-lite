# New iNRECO logo everywhere

Replace the current logo/app icon with the new square iNRECO badge (robot + tick) across the website, the shared document pages, social share previews, and the phone/desktop app icon.

## What changes for people using the app

- **Website**: the logo at the top of the home page, the industry pages (restaurants, supermarkets), the footer, and the install button all show the new badge.
- **Install on phone / desktop**: the icon that lands on someone's home screen becomes the new badge, including the round/"safe area" version Android crops.
- **Browser tab icon** (favicon): new badge.
- **Shared links** (WhatsApp, Facebook, LinkedIn, X): the picture that appears in the link preview becomes the new badge.
- **Shared document pages** (`/s/...`): the small iNRECO mark in the header and footer becomes the new badge. If a customer has uploaded their own company logo, theirs still takes priority — unchanged.
- **CARA page** and the "Get the app" page: new badge.

Generated PDFs and Word documents use the customer's own uploaded logo, so nothing changes there.

## Technical notes

1. Save the uploaded image once as the master logo:
   - `lovable-assets create --file /mnt/user-uploads/image-45.png --filename inreco-logo.png` → replaces the pointer used by `src/pages/Share.tsx`.
2. Regenerate the real files in `public/` from the upload (square, padded, no stretch):
   - `favicon.png` (64), `icon-192.png`, `icon-512.png`, `logo.png`
   - `icon-maskable-192.png` / `icon-maskable-512.png` — same art inset ~12% with a solid background colour so Android's circular crop doesn't cut the wordmark
   - `social-preview.png` — 1200×630 with the badge centred on the brand navy background
3. Point the social tags in `index.html` at `social-preview.png` (currently `icon-512.png`) for `og:image` / `twitter:image`, and update the width/height tags to 1200×630. Keep the Organization structured-data `logo` on `icon-512.png`.
4. Swap the wordmark images in `index.html` (three `inreco-logo-cut.png` spots) to the new logo asset, and the `/favicon.png` badge near line 2792.
5. No changes needed in `manifest.json` (same filenames), `src/components/InstallAppButton.tsx`, `src/pages/GetApp.tsx`, or `src/pages/Cara.tsx` — they already reference the paths being overwritten.
6. Verify with a quick browser pass: home page, `/restaurants`, `/get`, `/app`, and a share page render the new mark; manifest icons resolve 200.

Note: link previews on WhatsApp/Facebook stay cached for a while, so an already-shared link may keep showing the old picture until those platforms re-fetch it.

## Replace favicon with the uploaded iNRECO logo

1. Copy `user-uploads://shortcut-2.png` to `public/favicon.png`.
2. Delete `public/favicon.ico` (browsers request `/favicon.ico` by default and it would override the new one).
3. Update the `<link rel="icon">` tag in `index.html` to point to `/favicon.png` with `type="image/png"`.

No other changes.

## What's wrong today

The old page in your GitHub project `inreco-app-landing` is a separate, frozen copy. Right now it still shows the Business plan at **R499** instead of **R599**, it has no "Join now & pay" buttons, no "Install the app" or "Share with a friend" buttons, no sick-note verification section, and its buttons point at older addresses. Every time we improve the real page, that copy falls behind again.

## The fix

Turn that old page into a signpost: anyone who opens it is sent straight to the real page at `app.inreco.co.za`. Then the two can never differ again, because there is only one real page.

## What you do (about 3 minutes, all in your web browser)

1. Go to your project page on GitHub: `github.com/badenhorstcasper-ops/inreco-app-landing`
2. Click the file named **index.html** (that file is the old landing page).
3. Click the **pencil icon** at the top right of the file (the "edit" button).
4. Press **Ctrl+A** (or **Cmd+A** on a Mac) to select everything, then **Delete**. The box should now be empty.
5. Paste in the text block below exactly as it is.
6. Scroll down, click the green **Commit changes** button, leave the message as it is, and confirm.
7. Wait about 2 minutes, then open `inrecoapp.inreco.co.za` in a private/incognito window. It should flick over to the real page by itself.

## The text to paste

```text
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>iNRECO Pocket Consultant — SA labour help in your pocket</title>
    <meta name="description" content="Instant South African labour guidance from CARA, plus ready-made warnings, hearings and HR documents." />
    <link rel="canonical" href="https://app.inreco.co.za/" />
    <meta http-equiv="refresh" content="0; url=https://app.inreco.co.za/" />
    <script>window.location.replace("https://app.inreco.co.za/" + window.location.search);</script>
  </head>
  <body style="font-family:system-ui;text-align:center;padding:60px">
    <p>Taking you to iNRECO…</p>
    <p><a href="https://app.inreco.co.za/">Tap here if nothing happens</a></p>
  </body>
</html>
```

## Why this is safe

- Anyone who saved the old address as a bookmark still lands in the right place.
- Partner links with a referral code (the `?ref=` part of a link) are carried across, so salespeople still get credit.
- Nothing on the live app changes, so there is no risk of breaking what already works.

## Optional, even cleaner (only if you want to)

Instead of the above, at your domain provider (Domains.co.za) you can point `inrecoapp` to the same place as `app`. That removes the old page completely. The paste-in step above works on its own, so do that first and treat the domain change as a later tidy-up.

## After you've done it

Tell me and I'll open the address myself and confirm it lands on the correct live page with the right prices and buttons.

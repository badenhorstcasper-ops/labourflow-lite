## Why this happened (so the fix makes sense)

There are two copies of your app: the **preview** you watch me build in, and the **live** site your customers use. The visible pages go live when you press Publish. The behind-the-scenes services go live on their own, separately. A batch of them never arrived on the live copy, and nothing checked. My earlier "end-to-end" checks only ever touched the preview, so they passed while live was broken.

The fix has to be a permanent, visible check — not a promise from me to be more careful.

## 1. A real live check, right now

I open the actual live site (app.inreco.co.za), not the preview, and for every behind-the-scenes service I confirm it answers there. Twenty services. Each one gets a plain PASS or FAIL with what I did to test it.

Then I walk the live site as a stranger would, in a fresh browser with no login: landing page, pricing, start a trial, sign up, sign in, CARA, documents, sick-note verification, company profile, settings, team invites, partner sign-up, contact form. Same PASS/FAIL treatment, no summarising.

You get one list. Anything that fails, I fix and re-test on live.

## 2. A permanent health page you control

A new page inside your admin area, visible only to you. One button: **Check live app now**. It contacts every behind-the-scenes service on the *live* site and shows a green or red line for each, with the time of the check.

This means you never have to take my word for it again. Publish, open the page, press the button. Green means the whole thing is working. Red tells you exactly which piece isn't, in plain language ("Team invites — not responding").

## 3. An automatic check every time you publish

After each publish, the same sweep runs by itself and the result gets written to that health page. If anything is red, the page shows a warning banner the next time you open the admin area, so a silent failure can't sit unnoticed for a month.

## 4. Something you can use on your other apps

I'll write you a short, plain-English instruction you can paste into any other Lovable project of yours. It tells that project's assistant to test the **live** site specifically — not the preview — service by service, and to report PASS/FAIL with evidence rather than a summary. One paste per app, no long back-and-forth, so checking the other apps and the client's app costs you very little.

## 5. A standing rule for this project

I'll record a permanent instruction for myself in this project: never describe anything as tested, working, or end-to-end unless it was verified on the live site, and always say plainly which copy was tested. That rule survives between sessions.

## Technical notes

- The live check calls each deployed edge function's health path directly against the production project and records status, response time and error text.
- The health page is a new admin-only route reading from a small `service_health_checks` table (admin-only read, service-role write), populated by a `live-health-sweep` edge function.
- The post-publish sweep runs on a schedule shortly after each deploy and on demand from the button.
- No changes to payments, auth, RLS or any customer-facing behaviour are part of this work.

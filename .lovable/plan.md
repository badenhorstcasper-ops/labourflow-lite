## What I'll do

A hands-on audit of the whole app — clicking every page, button, link and form myself in a real browser signed in as you, then writing up a pass/fail report. Nothing is marked "pass" unless I actually saw it work.

Test records will be created and left in place (you asked for this), clearly labelled with "QA TEST" so you can spot and delete them later.

## Scope

**Every page, in three groups**

- Open to everyone: home, pricing, sign-in, contact, terms, privacy, disclaimer, payment success, payment cancelled, shared-document link, partner apply, partner agreement, "page not found"
- Needs a paid/trial account: CARA hub, dashboard, generate documents, verify sick note, documents library, company profile, billing/settings
- Owner/partner only: owner overview, admin, partners/commissions, marketing, new partner, partner decision, partner portal, partner marketing, health & errors

For each: does it load, is it blank, does it hang, are there errors behind the scenes, and does it correctly block or allow people who aren't signed in.

**Every button and link**

Each one clicked, with the page it actually lands on recorded. Links that leave the app (health-council registers, government labour tools, payment provider, contact links) get opened for real and the page that comes back is recorded — including any that are dead or redirect somewhere unexpected. Buttons that do nothing visible when clicked get flagged.

**Every form**

Submitted twice — once with sensible data, once with bad/missing data. Then I reload the page and check the data actually stuck, rather than trusting the "saved" message.

**Saving and uploading files**

Company logo, sick-note attachments, partner marketing uploads: upload, then reopen and re-download to confirm the file is real and not empty. Wrong file types and oversized files tested too.

**Generating documents**

Every template in the library, plus the sick-note charge sheets, generated as both PDF and Word — then opened and read to confirm no leftover placeholders, no blank fields, correct branding. Each one tested twice: with full details filled in, and with only the bare minimum.

**Sharing**

Share links generated, then opened in a clean browser session with no login, to confirm an outsider can actually see the document.

**Owner analytics and error monitoring**

I'll deliberately break something and cause an error, then check whether your owner/health dashboard notices it and shows it. I'll also cross-check the numbers on those dashboards against the real data. If the dashboard misses the error I planted, that gets recorded as a failure of the dashboard itself.

## Two things I can't fully prove

- **Payments**: I'll click the trial buttons and confirm the payment provider page opens with the right amount and details, then stop. No real money moves, so the part after payment is recorded as "not fully tested".
- **Emails**: I can confirm the app tried to send and that the send was recorded, but I can't open your inbox. Those get recorded as "partly tested" with a note of exactly what to look for.

## The report

Delivered as a document you can download, containing:

1. A summary table — how many pages, buttons/links, forms, and document functions were tested, with pass / fail / partly-working counts
2. Every failure and partial, listed one by one: the exact page and button, what should have happened, what actually happened, and the likely cause
3. A plain confirmation for each category that fully passed, naming exactly what was checked
4. A clearly separated "Suggestions" section — my opinion only, not bugs — covering anything that could annoy or underwhelm a paying subscriber, ranked high/medium/low impact

## Note on fixes

This plan is the audit only — finding and recording problems. I won't change any app code while auditing, so the report reflects the app exactly as it is today. Once you've read it, tell me which items to fix and I'll do those as a separate round.

## Technical detail

Testing is driven through a real headless browser against the running app with your signed-in session restored, capturing console errors, network failures and screenshots per page. Generated files are opened and inspected page by page. Database checks confirm saved records exist. External links are fetched directly and the final resolved address recorded.

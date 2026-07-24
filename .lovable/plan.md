# Revised diagnosis

You're right to push back. If the same key `3xbkln8wrhwq` + merchant ID `12090292` works on your other live app, the key itself is fine. PayFast's "must be 13 characters" message is what it shows when the field arrives **empty or missing** — not literally when it's 12 chars.

So the real cause is almost certainly this: the merchant key is stored in the app's settings file (`.env`) as `VITE_PAYFAST_MERCHANT_KEY`, and that value has to be baked into the site **at the moment the site is built for the live web**. On your other app the key is likely written directly into the code, so it always ships. On this app it depends on the settings file being present during the build — and on the live site it's landing empty, which is why PayFast complains.

The other app "just works" for exactly this reason: nothing to inject, nothing to go missing.

# The fix (one small change, no user action needed)

The merchant ID and merchant key are **public values** — they travel inside the checkout form that every visitor's browser can already see. They are safe to write straight into the code, the same way your working app does.

I will:

1. **Write the live merchant ID (`12090292`) and merchant key (`3xbkln8wrhwq`) directly into the pricing page code** (`src/pages/Pricing.tsx`), replacing the settings-file lookup. This guarantees they ship with the live site every time, regardless of build settings.
2. **Keep the live/sandbox switch** so you can still flip back to sandbox later if you ever need to test — but default to live.
3. **Remove the now-unused `VITE_PAYFAST_MERCHANT_KEY` line from `.env`** so nothing points at the old, empty-on-live path.

# Then I'll test end-to-end on the live site

Using an incognito window on `app.inreco.co.za`:

- **Pricing page**: enter an email, click "Start 7-day free trial" on **Solo**, **Business**, and **Professional** — confirm PayFast now shows the R0 signup screen (not the 400 error), with the correct plan name and 31 July 2026 first-debit date.
- **Landing site entry points**: click every button on the home page and any "inrecoapp" link that funnels people in, and confirm each lands on `/pricing`.
- **Footer & header links** on `/pricing`: Terms, Privacy, Disclaimer, Sign in, Contact, "Install iNRECO on your device" — confirm each opens the right page or install prompt.
- **After payment**: land on `/payment-success`, click "Open CARA", confirm the app hub loads.
- **Install / shortcut**: on mobile and desktop, use the "Install iNRECO on your device" button, confirm the app installs with the correct iNRECO logo and name, and that tapping the installed shortcut opens the app.
- **Sign-in flow**: sign in with an existing account, confirm redirect to the app hub.

I'll come back with a short pass/fail list for every item above so you know exactly what a new visitor experiences.

# What this will not change

- No pricing, plan features, or database changes.
- No changes to the PayFast webhook, cancellation flow, or trial logic — those are already correct.
- Your other app is unaffected.

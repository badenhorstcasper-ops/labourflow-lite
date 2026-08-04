# Fix the sign-up funnel and check the whole app

## What I found (from your live data)

- **Nobody has ever completed a sign-up.** There are only 2 accounts in the system, both yours. Yet the "Sign in / create account" page was opened 202 times and the pricing page 129 times in the last 6 weeks. So people are arriving and turning back.
- **The trial demands a bank card before an account exists.** Today the only way in is: type your email on the pricing page → get sent to PayFast → hand over card details → and only then create an account. For a "7-day free trial" that is the single biggest reason strangers walk away.
- **Every payment attempt is stuck as "pending".** All 17 payment attempts are still marked pending, and the recent payment notices coming back from PayFast were all rejected by the app as "wrong merchant". That means even if someone did pay, the app would not switch them on.
- **The buttons look broken.** On a phone, the trial button reads "Enter your email above" until an email is typed, sitting right next to "Join now & pay R259". It reads like the trial is unavailable.
- **The wording got mangled.** A bad bulk word-swap turned "labour law" into "Pocket Labour law" everywhere ("Your Pocket Labour Consultant", "an Pocket Labour-law assistant"). "Pocket Consultant" as a brand stays; the broken sentences get repaired.
- **Visitor tracking never records who is signed in**, so your own admin numbers understate real usage.

## What I will change

### 1. Free trial with no card (the big one)
- Pricing pages get one clear main button per plan: **"Start free — no card needed"**, plus a smaller "Join now & pay" for people who want to skip the trial.
- That button takes them straight to a short sign-up (email + password, or Google), and the 7-day trial starts immediately — no PayFast, no card.
- Days 1–7 they get the full plan. From day 5 the app shows a friendly "Add your payment details to keep going" banner with a one-tap PayFast button.
- On day 8 without payment, the account drops to a locked state that still lets them log in and pay, so nothing is lost.
- Existing behaviour for people who choose to pay right away is untouched.

### 2. Fix the payment activation
- Correct the merchant check so real PayFast notices are accepted and accounts actually switch on.
- Tidy the stuck "pending" attempts so your admin numbers are honest.

### 3. Fix the wording
- Repair every mangled "Pocket Labour" sentence on the landing page, the industry pages, the page descriptions and CARA's own instructions — keeping "iNRECO Pocket Consultant" as the brand.

### 4. Clean up the buttons and first-run experience
- No more "Enter your email above" buttons; buttons always read as actions.
- After sign-up the person lands on CARA with a short "ask me anything" starter, not on an empty company-profile form.

### 5. Full end-to-end check
I will then walk the whole app as a brand-new visitor on a phone and on desktop: landing → trial sign-up → CARA question → generate a document → verify a sick note → invite a team member → add payment → cancel — and report anything else that breaks.

## Technical notes

- New `trialing` handling in `subscriptions` (start trial rows server-side on sign-up, `trial_ends_at = now() + 7 days`), with `useSubscription` treating an unexpired trial as entitled and an expired one as locked.
- New edge function `start-trial` (JWT-verified) so a trial can only be started once per account/email, plus abuse guards on repeat emails.
- `payfast-webhook`: merchant-id comparison uses the configured live merchant ID rather than the hardcoded constant; log the mismatch value so future failures are diagnosable.
- Pricing/Settings CTA refactor stays in presentation code; PayFast wallet and scan-to-pay options remain as they are.
- `usePageView` to include the signed-in user id.

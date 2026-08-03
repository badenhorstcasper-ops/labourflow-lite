# Apple Pay, Google Pay and Scan to Pay at checkout

Add wallet buttons and a QR "Scan to Pay" tab next to the existing pay buttons, everywhere the app charges someone through PayFast. Nothing about the current card/EFT flow changes.

## Where these get added

1. **Pricing / subscription checkout** (`/pricing`) — the main screen with Solo, Business and Professional. Each plan card keeps its current "Start 7-day free trial" and "Pay now" buttons, and gains the wallet buttons plus a "Scan to Pay" tab.
2. **Upgrade / change plan pop-up on the landing app** (the plan picker inside `index.html`, used by `payWithPayfast`) — same three new options.
3. **Settings → Billing** — today this screen only cancels. It gains a "Change plan" area that uses the same checkout options, so upgrades and downgrades happen in-app instead of bouncing to the pricing page.

Two things worth knowing before we build:

- **Partner billing does not charge anyone.** Approved partners get a free Solo account and the partner portal only shows payouts owed *to* them. There is no PayFast payment on any partner screen, so there is nothing to add there. If you want partners to pay for something in future, say the word and it becomes a fourth screen.
- **Free trial and wallets.** A trial checkout sends R0.00 today and sets up a recurring debit. PayFast's recurring billing is built around cards, and the wallets (Apple Pay, Google Pay) are not guaranteed to be accepted for a R0 sign-up-and-store-card transaction. So: wallet buttons appear on the **"Pay now"** action (immediate payment) always, and on the **trial** action only after we confirm in the sandbox that PayFast accepts them there. If sandbox rejects it, the trial keeps the normal button and I'll tell you.

## Wallet buttons

- Tapping one runs the exact same checkout we run today — same amount, plan, reference, success and cancel links, same webhook. The only difference is one extra hidden field telling PayFast which method to open: `ap` for Apple Pay, `gp` for Google Pay.
- Styling uses Apple's and Google's own black button look and logos, not our brand colours.
- Apple Pay only shows on Safari / Apple devices. Google Pay only shows on Chrome, Android, or desktop Chrome. The other one is hidden.

## Scan to Pay (QR)

This works differently from the wallet buttons, and here is why.

PayFast's checkout is a signed form that gets **posted** from the browser — there is no plain web address we can drop into a QR code. So the QR will point at a short page on our own site, e.g. `app.inreco.co.za/pay/ABC123`, where `ABC123` is the reference for that already-created checkout. Whoever scans it lands on that page on their phone, sees the plan and amount, and is handed straight to PayFast with the same reference. Same money, same plan, same confirmations.

Details:

- It sits behind a clearly labelled **"Scan to Pay"** tab, not the default view.
- The code is only drawn once the checkout details exist (amount, plan, reference).
- The reference has a limited life. When it lapses the code greys out with a "Refresh code" button, so nobody can scan something stale.
- Separately, PayFast itself lists a "Masterpass Scan to Pay" method (`mp`). That is PayFast showing *their* QR on *their* page, for the person already sitting at the checkout. It solves a different problem to yours, so I'll add it as a small extra choice inside the Scan to Pay tab but the cross-device QR above is the main one.

## Cancel subscription

The cancel button already exists in **Settings → Billing** and only shows while a plan is active or on trial. As part of this work I will:

- Test it end to end on a live-style account: press cancel, confirm the plan flips to cancelled, confirm PayFast stops the recurring debit, confirm access is withdrawn correctly.
- Add the same cancel option to the plan area we're adding in Settings so it is impossible to miss.
- Make sure cancelling during the free trial stops the first debit ever happening.

## Testing before I hand it back

- Apple Pay button shows on an Apple browser only; Google Pay on Chrome/Android only.
- Each wallet button lands on the right PayFast screen.
- The QR scans on a phone and opens a working payment for the right amount.
- A stale QR refuses to pay and offers a refresh.
- A plain card checkout and a plain trial sign-up still behave exactly as they do today.
- Cancel works.

## Technical notes

- `supabase/functions/payfast-checkout/index.ts` accepts an optional `paymentMethod` (`ap` | `gp` | `mp`), validated against a whitelist and added to the signed field set before the MD5 signature is built (order matters for the signature).
- New edge function `payfast-resume-checkout`: given an `m_payment_id`, re-derives and re-signs the same field set from the stored `payfast_transactions` row, rejecting rows that are not `pending` or older than the session window. Used by the QR landing route.
- New public route `/pay/:reference` (`src/pages/PayLink.tsx`) that calls the above and auto-posts to PayFast.
- New shared component `src/components/PayfastPayOptions.tsx` holding the wallet buttons, device detection and the Scan to Pay tab; consumed by `Pricing.tsx`, `Settings.tsx`, and mirrored in the vanilla plan picker inside `index.html`.
- QR rendering reuses the existing QR dependency already used by Refer & Earn.

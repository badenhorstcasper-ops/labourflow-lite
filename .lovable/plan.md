## Goal

Bring `index.html` (the landing page at app.inreco.co.za / inrecoapp.inreco.co.za) in line with the updated subscription tiers:

- Solo — R259 / 1 user
- Business — R499 / 5 users (Most Popular)
- Professional — R1,499 / 10 users
- Enterprise — R3,999 / 15 users — all start with a 7-day free trial.

The main pricing section (lines 524–600) already lists the correct tiers. Two things are out of sync.

## Changes

### 1. Replace the stale Upgrade modal (lines 778–797)

Currently shows the old 3-tier model (Solo R259, Business R499, Enterprise **R1,200 / unlimited users**) plus a Pay-as-you-go R29/question card.

Replace those 4 `.plan` cards with 4 new cards matching the live tiers:

- Solo — R259/month — 50 AI questions/month · All documents · CCMA tracker · CARA AI adviser
- Business (`featured`) — R499/month — Unlimited questions · Up to 5 users · All documents · CARA · CCMA tracker
- Professional — R1,499/month — Everything in Business · Up to 10 users · Dedicated CARA · WhatsApp support
- Enterprise — R3,999/month — Everything in Professional · Up to 15 users · Always-on CARA · Pay 10 get 12 annual · WhatsApp support

Each button: `Start 7-day free trial`, calls `selectPlan('<Tier>')`. Remove the PAYG card entirely. Update modal copy to "Start a 7-day free trial on any plan." (already says this — keep).

### 2. Unify CTAs in the main pricing section (lines 548–585)

Solo button already reads "Start 7-day free trial" and routes to `/pricing`. Make the Business, Professional, and Enterprise buttons match:

- Button label: `Start 7-day free trial` (was "Get Business" / "Get Professional" / "Get Enterprise")
- Button action: `window.location.href='/pricing'` (was `payWithPayfast('<Tier>')`)

This routes every paid tier through the React `/pricing` page, which already implements the proper PayFast 7-day-trial form (R0 today, recurring debit after 7 days) — matching the trial promise in the section header.

### 3. Leave handlers alone

`payWithPayfast` and `selectPlan` stay (still used by the upgrade modal and post-signup resume flow). `PLAN_AMOUNTS` already has all four tiers.

## Files touched

- `index.html` — only the two blocks above. No JS logic changes, no other sections, no styling changes.

## Out of scope

- Tier names, prices, feature lists themselves (user confirmed they're correct).
- The React `/pricing` page (already matches).
- Footer, auth, or any other section.

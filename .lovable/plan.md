## Goal

Update the in-app pricing page (`src/pages/Pricing.tsx`) so it matches the landing-page pricing exactly: 5 tiers, feature bullets per tier, a "Most Popular" badge on Business, and a "Contact Us" action on Enterprise instead of a PayFast subscribe button.

The amounts (R259 / R499 / R1,499 / R3,999) already match — what's missing is the Free/Starter tier, the feature bullet lists, the popular badge, and the Enterprise contact CTA.

## Changes

Edit only `src/pages/Pricing.tsx`:

1. Expand the `PLANS` array to 5 entries with:
   - `name`, `amount` (0 for Free), `seats`, `tagline` (e.g. "1 user · 5 questions/month"), `features: string[]`, `cta` label, `highlight?: boolean` (Business), `kind: "free" | "paid" | "contact"`.
2. Render 5 cards in a responsive grid (`md:grid-cols-2 lg:grid-cols-5`).
3. Per card:
   - Show name, price (`R0` / `R259` etc.) with `/mo` (except Free shows "Forever free" and Enterprise shows "per month").
   - Tagline line under the price.
   - Bulleted feature list (Check icon from lucide-react).
   - "Most Popular" ribbon on Business (using a small badge above the card or absolute-positioned tag, themed with semantic tokens).
   - CTA button:
     - Free → `Link` to `/auth` ("Get Started Free").
     - Solo / Business / Professional → existing PayFast `<form>` (kept as-is, just driven by the plan object).
     - Enterprise → `mailto:` link or `Link` to a contact route ("Contact Us"). Use `mailto:info@inreco.co.za` unless you tell me a different address.
4. Keep the existing guest-email block and PayFast hidden fields; only paid plans render the form.
5. No backend, schema, or PayFast field changes. No edits to the landing page or other components.

## Plan content (verbatim from your message)

- Free / Starter — R0 — "1 user · 5 questions/month" — features: 5 AI questions/month; All topic wizards; Basic documents; CARA AI adviser — CTA: Get Started Free.
- Solo — R259 — "per month · 1 user" — features: 50 AI questions/month; All documents; CCMA deadline tracker; CARA AI adviser — CTA: Get Solo.
- Business (Most Popular) — R499 — "per month · up to 5 users" — features: Unlimited questions; Up to 5 registered users; All documents; CARA AI adviser; CCMA tracker — CTA: Get Business.
- Professional — R1,499 — "per month · up to 10 users" — features: Everything in Business; Up to 10 registered users; CARA as your dedicated AI adviser; WhatsApp support — CTA: Get Professional.
- Enterprise — R3,999 — "per month · up to 15 users" — features: Everything in Professional; Up to 15 registered users; CARA as always-on IR adviser; Annual option — pay 10 get 12; WhatsApp support — CTA: Contact Us.

## Open question

What should the Enterprise "Contact Us" button do — open `mailto:info@inreco.co.za`, or link to a contact page/route you already have? If you don't answer I'll default to `mailto:info@inreco.co.za`.

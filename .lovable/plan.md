## 1. Remove the free "Starter" tier

**`src/pages/Pricing.tsx`** — delete the Starter plan from `PLANS`; update subheading to highlight the 7-day free trial.

**`index.html`** (legacy marketing + app shell)
- Remove the Starter pricing card (line ~516).
- Remove "5 free questions/month" hero copy (lines 510–511), the "Ask CARA your first question free" CTA (line 598), and the "Start with 5 free questions" tagline (line 626).
- Remove the in-app free-question trial mechanic:
  - `trialBadge` element + click handler (lines 722–723, 1912)
  - "You've used your 5 free questions" paywall modal (line 771)
  - Dev override + counter logic (lines 806, 1068)
- In `SEAT_LIMITS` and `currentPlanName` (lines 2262–2288): drop `Starter`; default plan to `null` so users without a subscription get routed to `/pricing`.

## 2. Add a 7-day free trial to Solo, Business, Professional

**Pricing UI**
- Add "7-day free trial · cancel anytime · no charge during trial" line under each of the three paid plans (Enterprise stays "Contact Us").
- Change paid-plan CTA copy to "Start 7-day free trial".

**PayFast checkout (`src/pages/Pricing.tsx` form)**
PayFast supports a free trial on a recurring subscription via these fields:
- Keep `subscription_type = 1`, `frequency = 3`, `cycles = 0`.
- Set the signup `amount = 0.00` (card tokenised, no debit).
- Keep `recurring_amount` at the plan price.
- Add `billing_date = today + 7 days` (YYYY-MM-DD) so the first real debit only happens after the trial.

**Webhook (`supabase/functions/payfast-webhook/index.ts`)**
- When a `COMPLETE` ITN arrives with `amount_gross = 0`, treat it as **trial signup**: write subscription row with `status = 'trialing'` and `trial_ends_at = billing_date`. Skip the existing amount-mismatch check for zero-amount ITNs.
- On the first non-zero recurring ITN, the existing amount check applies and `status` flips to `'active'`.

**DB migration**
- `subscriptions`: add `trial_ends_at timestamptz` (nullable). Existing rows untouched. `status` is already free-text, so `'trialing'` needs no enum change.

**Access gate**
- Update the single place that checks `status = 'active'` to also accept `'trialing'`.

## 3. Legal pages: Terms, Privacy, Disclaimer

Three new React pages + routes, plus footer links and a signup checkbox.

**New files**
- `src/pages/Terms.tsx` → `/terms`
- `src/pages/Privacy.tsx` → `/privacy`
- `src/pages/Disclaimer.tsx` → `/disclaimer`

Each is plain readable prose using existing card/typography tokens, with a "Last updated" date and a print-friendly layout. All three pages are public (no auth).

**Confirmed company details** (from your POPIA certificate)
- Registered name: **INRECO CONSULTING** (sole proprietorship, proprietor Casper Hendrik Badenhorst)
- Trading / brand name: **iNRECO**
- Contact email: **info@inreco.co.za**
- Information Officer: **Casper Hendrik Badenhorst**
- Information Regulator registration: **2026-010530** (registered 24 April 2026)

Note: per project memory the user-facing brand stays "iNRECO". The legal pages will use the registered name only where the law requires it (responsible-party identity for POPIA, supplier identity for ECTA §43). I will **not** use "iNRECO Consulting" anywhere else.

**Content scope**
- **Terms of Use** — ECTA 2002 §43 supplier disclosures (legal name, IO contact, description of service, payment terms, refund / cancellation, 7-day cooling-off honoured by the free trial, termination, acceptable use, IP, limitation of liability, governing law = RSA, dispute resolution), plus subscription / auto-renewal terms, account & device limits, team-seat rules.
- **Privacy Policy** — POPIA-compliant: responsible party identity, Information Officer + Regulator registration number, categories of personal information (account, company profile, generated documents, payment metadata via PayFast as operator, error logs, device IDs), purposes, lawful basis, operators (Lovable Cloud / Supabase, PayFast), cross-border transfers, retention, data-subject rights (access, correction, deletion, objection, complaint to the Information Regulator with the Regulator's contact details), cookies / local storage, security measures (RLS, HIBP, TLS in transit).
- **Disclaimer** — iNRECO provides IR guidance and document templates, **not legal advice**; CARA AI output may be inaccurate and must be reviewed by a qualified labour relations practitioner or attorney; no attorney–client relationship; users remain responsible for LRA, BCEA, EEA and CCMA compliance.

**Wiring**
- `src/App.tsx`: register `/terms`, `/privacy`, `/disclaimer` (public routes).
- `src/components/AppShell.tsx` footer: add "Terms · Privacy · Disclaimer" links beside the © line.
- `index.html` legacy footer + signup form (line 638): add the three links; update checkbox to "I agree to the Terms of Use, Privacy Policy and Disclaimer."
- `src/pages/Auth.tsx`: add the same required checkbox above the Sign-up button.

## Out of scope
- No cookie-consent banner — the app only uses essential storage (auth session + install hint), which POPIA does not require opt-in consent for.
- No changes to existing pricing amounts.
- No external payment-provider switch.

I'll wait for your approval, then build in this order: DB migration → Pricing.tsx + index.html cleanup → PayFast trial fields + webhook → three legal pages + footer/auth wiring.

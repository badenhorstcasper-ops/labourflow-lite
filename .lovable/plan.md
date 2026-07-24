
## 1. PayFast payouts — short answer

PayFast does **not** split payments or pay third parties for you. Every subscriber's rand goes into your PayFast merchant wallet, and PayFast pays that out to your bank. Commission to salespeople is **paid by you, manually by EFT**, using the monthly commission report the app already generates (`/admin/commissions` → "Mark as paid").

There are two ways to automate later, both out of scope for this change:
- PayFast Split Payments (requires PayFast to enable it on your account, each partner needs their own PayFast merchant, and it changes the checkout flow).
- A separate payout provider (Ozow, Stitch Payouts, etc.) — extra fees, extra KYC.

Recommendation: keep the current monthly EFT flow. It's clean, POPIA-safe, and matches the 3-business-day rule already in the plan.

## 2. Demo Solo access for approved salespeople (silent)

When admin approves a salesperson (existing `approve-salesperson` function):
- Create/refresh a `subscriptions` row for that salesperson's email:
  - `plan_name = 'Solo'`, `status = 'active'`, `is_demo = true` (new column), `device_limit = 1`, no PayFast token, no billing date.
- On first sign-in (existing `link_subscription_on_signup` trigger already links by email) they land straight in the app with Solo features.
- `useSubscription` treats `is_demo = true` exactly like a paid Solo — no UI copy, no badge, no upsell for them.
- Device limit: existing `register_device` RPC already enforces a 2-device max; we tighten it to 1 when the subscription row is `is_demo = true`.
- If admin later deactivates the salesperson, the demo subscription flips to `status = 'inactive'` and access is blocked by the existing `RequireSubscription` guard.
- Nothing about demo access appears anywhere in the UI, emails, or partner portal — as requested.

## 3. Marketing kit for partners

New page `/partner/marketing` (visible only inside `/partner` after sign-in):
- Downloadable assets grouped by type: **Social posts** (square + story), **WhatsApp flyers**, **A5 print flyer PDF**, **Email signature banner**.
- Each asset auto-personalised with the partner's referral link (`https://app.inreco.co.za/?ref=INR-XXXX`) rendered onto the image at download time (canvas), so every download is uniquely theirs.
- Storage bucket `partner-marketing` (private, signed URLs, admin-managed) holds the base artwork. I'll seed it with 4 starter designs matching the iNRECO brand — you can swap them any time from `/admin/commissions → Marketing assets` (new tab).
- Prominent yellow notice on the page:
  > "You are welcome to create your own ads. Any self-created advert **must be emailed to info@inreco.co.za for written approval before use**. Running unapproved ads is a breach of the Partner Agreement and will result in immediate termination of your referral code."

## 4. SA-law-compliant Partner Agreement + acceptance

Add a proper agreement, not a one-line checkbox. Two changes:

**A. New public page `/partner/agreement`** — full plain-language agreement (also linked from wizard, portal, and footer). Key clauses, written to comply with the Labour Relations Act, Basic Conditions of Employment Act, Income Tax Act, and POPIA:

1. **Independent contractor, not employment.** The parties expressly record that this is a commercial referral arrangement. It is **not** employment, not a fixed-term contract, not a "dependent contractor" arrangement, not a labour-broking arrangement, and creates **no reasonable expectation** of employment now or in future. The partner is not entitled to a salary, leave, UIF, COIDA, pension, medical aid, 13th cheque, notice pay, or severance. Nothing in this agreement, or in any communication, training material, marketing kit, or WhatsApp/email exchange, may be construed as creating an employment relationship. (Uses the wording courts test against — control, integration, economic dependence — and explicitly disclaims each.)
2. **Voluntary participation.** Signup is entirely voluntary. iNRECO prescribes no hours, no territory, no minimum sales, no dress code, no reporting line, no tools, and does not supervise the partner's day.
3. **Own tax & statutory obligations.** The partner is solely responsible for their own SARS registration and returns (income tax, provisional tax, VAT if applicable), UIF (if they employ others), and any other statutory filings. iNRECO will **not** deduct PAYE, UIF or SDL and will issue no IRP5.
4. **Commission-only remuneration.** The only money payable to the partner is the referral commission per the published rate card (Solo R50, Business R90, Professional R250, Enterprise R900 per active paid subscriber per month), paid by EFT within 3 South African business days of month-end, only for subscribers who complete payment via the partner's unique code. No commission is earned on trial-only signups, refunded payments, or chargebacks. No clawback on later cancellations.
5. **What the partner may access.** Only (a) their commission payouts, (b) a summary of subscribers under their code (first name + last-4 of email only — POPIA-minimised), (c) approved marketing materials. No access to subscriber personal data, banking details, or app content.
6. **Marketing conduct — protecting the brand.** The partner may not: make false, misleading, or exaggerated claims about iNRECO or its features; imply endorsement, employment or agency; run paid ads, SEO, Google/Facebook ads, or bulk email/SMS campaigns without prior written approval from info@inreco.co.za; use the iNRECO name, logo or trademarks except as supplied in the approved marketing kit; contact iNRECO customers or ex-customers directly; spam, cold-call in breach of the CPA/POPIA direct-marketing rules, or engage in any unlawful conduct. Breach = immediate termination of the referral code and forfeiture of unpaid commission earned through the breach.
7. **Confidentiality & POPIA.** The partner will keep any non-public information confidential and will not process personal information of any subscriber they may come across.
8. **Termination.** Either party may end the arrangement at any time on **one calendar month's written notice** (email to info@inreco.co.za or from info@inreco.co.za is sufficient). iNRECO may terminate **immediately without notice** for breach of clauses 6, 7, or any unlawful conduct. Commission validly earned before termination will still be paid on the next scheduled payout.
9. **No exclusivity.** The partner may promote other unrelated products. iNRECO may appoint any number of other partners.
10. **Governing law & forum.** South African law; disputes referred to the Magistrates' Court having jurisdiction, expressly **excluding the CCMA, bargaining councils and Labour Court**, which the parties agree have no jurisdiction because there is no employment relationship.
11. **Whole agreement / variation.** This is the whole agreement. Changes must be in writing (email accepted). Current version is displayed on `/partner/agreement` with a version number and effective date.

**B. Wizard step 3 (Confirm) changes** — replace the single checkbox with:
- Scrollable summary box of the 11 clauses above with a "Read full agreement" link.
- Three separate tick boxes (each required, each stored):
  1. "I have read and accept the iNRECO Partner Agreement (v1.0)."
  2. "I understand this is a **commission-only referral arrangement** and is **not employment** — I will not claim UIF, leave, salary or any other employment benefit from iNRECO, now or in future."
  3. "I understand I am responsible for my own SARS and tax affairs, and that I must get written approval from info@inreco.co.za before running any self-created advert."
- Full-name typed signature field + auto-captured timestamp, IP and user-agent.
- All of the above written to a new `partner_agreements` table (immutable, one row per acceptance, includes agreement version) so you can produce proof years later.

## 5. Admin & housekeeping

- `/admin/commissions → Partners tab`: show acceptance record (version, date, IP) and a "Terminate with 1-month notice" button — sets `status='notice'`, `notice_end_date = today + 1 calendar month`, disables demo access on that date, keeps the referral code active until then, and emails the partner the notice automatically. An "Immediate termination for breach" button is also available with a required reason field (logged).
- Footer link "Become a partner" already exists; add second small link "Partner Agreement".

## Technical notes (for reference)

- New migration:
  - `subscriptions.is_demo boolean default false`, `subscriptions.device_limit int default 2`.
  - `salespersons.status` add `'notice'` value; add `notice_end_date date`, `terminated_reason text`.
  - New table `partner_agreements` (id, salesperson_id, version, accepted_full_name, accepted_ip, accepted_user_agent, accepted_at, clause_flags jsonb) with RLS: partner reads own, admin reads all, no client writes.
  - Update `register_device` RPC to read `subscriptions.device_limit` for the caller.
- `approve-salesperson` edge function: on approve, upsert the demo `subscriptions` row.
- New edge function `terminate-partner` (admin-only) handles notice vs immediate.
- New page `src/pages/PartnerMarketing.tsx` + storage bucket `partner-marketing` (private, admin uploads via `/admin/commissions`).
- New page `src/pages/PartnerAgreement.tsx` (public, versioned constant in `src/lib/partnerAgreement.ts` so we can bump versions cleanly).
- Wizard `src/pages/PartnerApply.tsx`: rebuild step 3, submit new fields to `submit-partner-application` which writes the `partner_agreements` row in the same transaction as the `salespersons` insert.

## Assumptions I'm making — flag if wrong

- You're happy to pay commissions manually by EFT (no PayFast Split Payments setup).
- I can seed 4 generic iNRECO-branded starter marketing assets that you can replace later.
- Agreement version "v1.0" with today's effective date is fine as the launch version.

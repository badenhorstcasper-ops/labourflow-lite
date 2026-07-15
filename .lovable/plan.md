## Goal
Teach CARA about managing foreign national employees whose work visas or permits have expired, so questions about visas, permits, asylum seekers, work authorisation or Home Affairs get answered from the app itself — not from the AI — and the user can generate the matching documents in one tap.

## What gets added

### 1. New knowledge topics in `src/lib/cara/knowledge.ts`
Five new plain-English topics with keyword triggers so free-text questions route straight to the app brain:

1. **Foreign nationals: visa & permit expiry overview** (`visa_overview`) — the employer's ongoing duty under the Immigration Act, why this is treated as **statutory incapacity** (not misconduct, not retrenchment), and the two hard rules from case law: verify objectively, and give a fair process even when the law says you can't keep employing the person.
2. **Employee's work visa has expired or is about to expire** (`visa_expired`) — the step-by-step from monitoring → written notice → incapacity enquiry → decision, including when unpaid leave is a smarter interim step than suspension or dismissal.
3. **Asylum seekers and refugee permits** (`asylum_permit`) — Refugees Act permits, why DHA backlogs mean a longer monitoring window, and when a pending renewal must extend the process rather than shorten it.
4. **Verifying work authorisation & POPIA** (`visa_verification`) — DHA/authorised verification, passport & permit records, retention limits, who may see the file.
5. **Foreign-national dismissal fairness checklist** (`visa_dismissal_fairness`) — the fair-reason + fair-process + no-shortcuts test from Discovery Health, Kawalya-Kagwa, Joel and Sibanda, in checklist form.

Keywords include: visa, permit, work permit, work visa, foreign, foreigner, foreign national, immigration, home affairs, DHA, asylum, refugee, section 22, critical skills, expired visa, expired permit.

### 2. New document templates in `src/lib/documents/templates/`
Registered in the shared template system so the "Create the …" button appears in chat and documents render with the user's branding:

- **Foreign National Visa Expiry Procedure** (`visa_expiry_procedure`) — the full internal HR procedure (mirrors the uploaded document): purpose & scope, legal framework, guiding principles, roles, step-by-step, special circumstances, fairness checklist, record-keeping.
- **Visa expiry — incapacity enquiry notice** (`visa_incapacity_notice`) — invites the employee to an enquiry, sets out the expired documentation, section 38(1) risk, right to representations, right to be accompanied, possible outcomes.
- **Visa renewal reminder letter** (`visa_reminder_letter`) — the 90/60/30/14-day reminder to the employee to renew, with employer offer of reasonable assistance (important under **Joel**).
- **Statutory incapacity termination letter** (`visa_termination_letter`) — final outcome letter after the enquiry: reason (statutory incapacity), BCEA notice/pay, certificate of service, CCMA referral rights.

### 3. Router coverage
The existing router (`src/lib/cara/router.ts`) already matches templates by name/key and topics by keyword, so:
- "my employee's work visa expired, can I fire him?" → topic answer + "Create the incapacity enquiry notice" button.
- "draft a visa expiry procedure" → template opens directly in Generate.
- "asylum permit renewal is stuck at Home Affairs" → asylum-specific topic answer.

### 4. System prompt update in `supabase/functions/cara-chat/index.ts`
Add one line to `SYSTEM_BASE`: *"When a foreign national employee's work visa, permit or asylum documentation has lapsed, treat it as **statutory (legal) incapacity** — not misconduct and not retrenchment — following Discovery Health, Sibanda, Joel and Kawalya-Kagwa. Require verification with DHA, a reasonable opportunity to renew, employer assistance where practicable, and a fair enquiry before any termination."* Only used on the rare visa question that misses the built-in topics.

## Files touched
- `src/lib/cara/knowledge.ts` — add 5 topics
- `src/lib/documents/templates/index.ts` — register 4 new templates
- `supabase/functions/cara-chat/index.ts` — one line added to `SYSTEM_BASE`

## What is not changed
- No pricing, billing, subscription, auth, or UI shell changes.
- No new database tables.
- No changes to the AI provider or model.

## How the user will see it
- Five new topic chips on the CARA screen: **Foreign national visa overview**, **Expired visa — what to do**, **Asylum & refugee permits**, **Verification & POPIA**, **Visa dismissal fairness checklist**.
- Typing anything about visas, permits, foreign nationals, asylum seekers or Home Affairs instantly returns the app's own guidance — no AI call, no wait, no credits used.
- Users can generate the full **Visa Expiry Procedure**, a **renewal reminder**, an **incapacity enquiry notice** and a **statutory incapacity termination letter** straight from chat, branded with their company details.
- The tone stays consistent with the AARTO work already in the brain: verify → fair process → correct legal characterisation → document everything.

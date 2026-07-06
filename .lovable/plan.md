## Goal
Teach CARA about AARTO (Administrative Adjudication of Road Traffic Offences) and its impact on the employment relationship, so when a user asks anything about drivers, licence suspensions, demerit points, fleet policies, or dismissing an employee who lost their licence, CARA answers from the app itself — not from the AI.

## What gets added

### 1. New knowledge topics in `src/lib/cara/knowledge.ts`
Each is a native, plain-English topic with a chip on the CARA screen, a summary, an ordered steps list, related document templates, follow-up questions and keyword triggers. Six new topics:

1. **AARTO & the employment relationship** (`aarto_overview`) — when a traffic offence becomes a workplace issue; the employer's duty of care under OHSA; why driving employees are different.
2. **Employee loses their licence — misconduct or incapacity?** (`licence_lost`) — the two-scenario decision tree from the document (intentional/negligent conduct → discipline; suspension through demerits with no misconduct → incapacity), with the fair-procedure checklist.
3. **Employee hid a licence suspension** (`licence_hidden`) — reframes the matter as dishonesty and destruction of trust; discipline path.
4. **AARTO disclosure & licence verification** (`aarto_disclosure`) — what employers may lawfully require, POPIA compliance, periodic verification, contract wording.
5. **Driver / fleet / AARTO policies** (`driver_policy`) — what a Driver Policy, Fleet Management Policy, AARTO Compliance Policy and Disciplinary Code should each cover.
6. **Driving as an inherent job requirement** (`driving_inherent_requirement`) — contract clauses, positions where a licence is essential, insurance & operational risk.

Each topic gets appropriate keywords (aarto, demerit, demerits, licence, license, suspension, suspended, drivers licence, traffic fine, infringement, fleet, company vehicle, driver, delivery, etc.) so free-text questions route straight to the app brain.

### 2. New document templates in `src/lib/documents/templates/`
Registered in the shared template system so the "Create the …" button appears in chat and documents render with the user's branding:

- **AARTO / Driver Policy** (`aarto_policy`) — full policy: licence verification, annual checks, reporting obligations, demerit monitoring, disclosure duty, fleet rules, authorised drivers, accident reporting, disciplinary offences.
- **Driver contract addendum** (`driver_addendum`) — clauses making a valid licence an inherent requirement, disclosure duty, consent to periodic verification, consequences of loss.
- **Licence-suspension incapacity notice** (`licence_incapacity_notice`) — invites the employee to a meeting to discuss loss of an inherent job requirement and possible alternatives, before any incapacity hearing.
- **Licence-suspension disclosure request** (`licence_disclosure_request`) — formal request that the employee confirm licence status, demerit balance and any pending infringements.

### 3. Router coverage
Because the existing router (`src/lib/cara/router.ts`) already matches templates by name/key and topics by keyword, the new topics and templates will automatically:
- fire the correct built-in answer when someone asks e.g. "my driver lost his licence, can I fire him?"
- offer the "Create the AARTO policy" / "Create the driver addendum" button when someone says "draft an AARTO policy" or "write a driver contract clause".

### 4. System prompt update in `supabase/functions/cara-chat/index.ts`
Add one line to the base system prompt: *"AARTO (Administrative Adjudication of Road Traffic Offences Act 46 of 1998) affects the employment relationship — when a driving employee loses their licence, first ask whether it is misconduct (their fault) or incapacity (loss of an inherent requirement), and apply the LRA fairness rules to whichever path applies."* This only matters on the rare AARTO question that misses the built-in topics, so the AI stays consistent with what the app already teaches.

## Files touched
- `src/lib/cara/knowledge.ts` — add 6 topics
- `src/lib/documents/templates/index.ts` (and per-template files under `src/lib/documents/templates/`) — add 4 templates
- `supabase/functions/cara-chat/index.ts` — one line added to `SYSTEM_BASE`

## What is not changed
- No pricing, billing, subscription, auth, or UI shell changes.
- No new database tables.
- No changes to the AI provider or model.

## How the user will see it
- On the CARA screen, six new topic chips appear: **AARTO overview**, **Lost licence: discipline or incapacity?**, **Hidden licence suspension**, **AARTO disclosure**, **Driver & fleet policies**, **Licence as inherent requirement**.
- Typing anything about licences, demerits, AARTO, fleet, drivers or company vehicles instantly returns the app's own guidance — no AI call, no wait, no credits used.
- Users can generate a full **AARTO / Driver Policy**, a **driver contract addendum**, a **licence-suspension incapacity notice** and a **disclosure request** straight from chat, branded with their company details.

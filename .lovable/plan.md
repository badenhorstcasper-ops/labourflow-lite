## Goal

Make CARA genuinely useful end-to-end: she should be able to advise on any common SA labour issue, and for every issue there should be a matching document the user can generate in one click — without ever needing outside help for the routine stuff.

Two gaps today:
1. **CARA's knowledge** is thin — 10 topics, no follow-up questions, no "what next" suggestions, and the AI fallback has no grounding so it sometimes contradicts the in-app guidance.
2. **The document library** only covers 6 templates. Six of CARA's 10 topics (CCMA, grievance, suspension, retrenchment, union, incapacity) have no document to hand off to.

This plan closes both gaps.

---

## 1. Expand the document library (6 → 14 templates)

Add the following to `src/lib/documents/templates/index.ts` (same `TemplateDefinition` pattern, same `generateDocument` pipeline — house style and branding come for free):

| Key | Name | Used by CARA topic |
|---|---|---|
| `notice_hearing` | Notice of disciplinary hearing | Hearing, AWOL, Misconduct |
| `suspension` | Precautionary suspension letter | Suspension |
| `return_to_work` | AWOL / return-to-work letter | AWOL |
| `grievance_ack` | Grievance acknowledgement & outcome | Grievance |
| `retrenchment_s189` | s189(3) consultation notice | Retrenchment |
| `retrenchment_letter` | Retrenchment notice (post-consultation) | Retrenchment |
| `incapacity_notice` | Notice of incapacity enquiry | Incapacity |
| `counselling` | Counselling / coaching record | Performance, Misconduct |

Each template uses the same field/build shape the existing templates use, so they slot into Generate Docs and the CARA "Create the document" button automatically.

## 2. Deepen CARA's built-in knowledge

In `src/lib/cara/knowledge.ts`:

- Add a `followUps: string[]` field to each topic — 2–3 likely next questions ("How long does the CCMA process take?", "What if the employee doesn't pitch?"). The CARA hub renders them as tappable suggestion chips under the answer.
- Add a `relatedTemplates: string[]` field (multiple doc options per topic, not just one). e.g. AWOL → `return_to_work`, `notice_hearing`, `dismissal`.
- Add 5 new topics: **Probation**, **Resignation**, **Sick leave abuse**, **Working hours & overtime**, **Sexual harassment**.
- Expand keyword lists so plain-English phrasing matches ("he didn't come in", "she quit by SMS", etc.).

## 3. Smarter router

In `src/lib/cara/router.ts`:

- When a topic matches, return the topic AND its related templates (router currently returns only one).
- When the user's message contains a question word ("how long", "can I", "what if") on a known topic, prefer answering from knowledge first, but mark the answer as "expandable" so a "Ask CARA for more detail" button shows that triggers the AI fallback grounded with that topic's full text.
- Document-intent matcher recognises more phrasings ("send him a warning", "I want to fire her", "draft her contract").

## 4. Ground the AI fallback in the app brain

Update `supabase/functions/cara-chat/index.ts`:

- The client sends, alongside the messages, the matched topic key (if any) and the list of available template names.
- Edge function injects the topic's summary + steps into the system prompt as **authoritative context**, and lists the exact template keys CARA may suggest. This stops the AI inventing different processes or recommending documents that don't exist.
- Keep `google/gemini-3-flash-preview`. Add a hard 600-token cap so answers stay short.
- Parse the AI response for any `[[create:<template_key>]]` hint and surface it as a "Create the document" button on the AI message too (today only knowledge/template answers get a button).

## 5. CARA hub UX polish

In `src/pages/Cara.tsx`:

- Show follow-up suggestion chips under each assistant message.
- Render multiple "Create the …" buttons when a topic maps to multiple templates.
- Add a small "Start a guided wizard" link on heavy topics (retrenchment, hearing, incapacity) that opens Generate with the right template pre-selected and a 1-line context note in the form.
- Keep everything else as-is (composer, topic chips, profile-missing banner, in-memory chat — no persistence).

## 6. Verification

- Tap every one of the 15 topic chips → built-in answer renders, follow-up chips appear, "Create the …" buttons match the topic.
- Type "I need to retrench 3 people" → retrenchment topic → buttons for s189 notice + retrenchment letter.
- Type "what's the maximum overtime per week" → AI fallback grounded with the working-hours topic, no template button.
- Open Generate Docs → all 14 templates listed, each one generates a PDF + DOCX through the existing `generateDocument` pipeline (so iNRECO house style + company branding are automatic — per project memory).
- Existing flow (sign in → profile → `/app`) untouched.

## Out of scope

- Persisting chat history (still in-memory per session).
- Multi-language CARA.
- Redesigning Dashboard / Documents / Profile pages.
- Adding a separate "wizard engine" — guided flows are just the existing Generate form pre-filled.

## Technical notes

- All new templates are pure additions to `TEMPLATE_REGISTRY`; nothing existing changes.
- `knowledge.ts` gets two new optional fields (`followUps`, `relatedTemplates`); old `templateKey` stays for back-compat.
- Edge function change is backwards-compatible — old client calls still work; new client calls send extra context.
- No database/schema changes. No new secrets. No new dependencies.

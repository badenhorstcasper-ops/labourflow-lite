
## Goal
Replace the current `/dashboard` landing experience with the CARA chat hub shown in your screenshot. CARA becomes the place every signed-in user lands on, and Dashboard + Generate Docs become simple links from CARA's header. After saving the company profile, "Start using the app" goes straight to CARA.

## How CARA will answer (per your instructions)

For every topic chip AND every free-text question, CARA goes through this order and stops at the first hit:

1. **Built-in knowledge base** — a local JSON of South African labour-law snippets (LRA, BCEA, CCMA rules, Code of Good Practice) keyed to the 10 topics in the screenshot. Instant answer, no AI cost.
2. **Built-in document templates** — if the question is "give me a warning letter / contract / dismissal letter…", CARA hands off directly to the existing generator (the 6 templates already built).
3. **AI fallback** — only if neither of the above matches, call Lovable AI (`google/gemini-3-flash-preview`) with a tight SA-labour-law system prompt that explicitly tells the model to keep answers short and route the user to a document/wizard when relevant.

Topic chips don't run long step-by-step questionnaires. Each chip drops a short pre-written question into the chat that triggers the knowledge-base answer plus a "Create the document" button when relevant — so the user reaches an answer in one tap.

## What I'll build / change

### 1. New CARA hub page (`src/pages/Cara.tsx`, route `/app`)
- Header (in `AppShell`): **CARA**, **Dashboard**, **Generate Docs**, **Documents**, **Profile**, Account, Sign out. Home icon top-left goes to CARA.
- Body: exactly the screenshot — iNRECO logo, greeting using company name, 10 topic chips (No-show/AWOL, Issue warning, Disciplinary hearing, CCMA referral, Grievance, Suspension, Retrenchment, Poor performance, Union/attorney, Incapacity), starter cards ("Tap a topic above…", "Try an example", tip card), and a sticky composer at the bottom.
- Chat state lives in memory for now (no DB persistence) — keeps it simple and free. We can add history later.

### 2. CARA brain (`src/lib/cara/`)
- `knowledge.ts` — 10 topic entries, each with a short plain-English answer, a checklist of legally-required steps, and pointers to the matching document template(s).
- `router.ts` — given the user's text, runs keyword match against knowledge first, then template names, then returns `"ai"` to fall back.
- `useCara.ts` — React hook that owns messages, calls `router.ts`, and only invokes the edge function when needed.
- Edge function `supabase/functions/cara-chat/index.ts` — Lovable AI call, SA-labour system prompt, streamed via AI SDK.

### 3. Navigation rewire
- `src/pages/Index.tsx`: signed-in → `/app` (was `/dashboard`).
- `src/pages/Auth.tsx`: post-login redirects → `/app`.
- `src/pages/CompanyProfile.tsx`: "Start using the app" → `/app`.
- `src/components/AppShell.tsx`: replace current nav with **CARA / Dashboard / Generate Docs / Documents / Profile**. "Open app" button → `/app`. Add a visible Home icon that goes to `/app`.
- `src/App.tsx`: add `/app` route; keep `/dashboard` route working (still linked from CARA header).
- Existing Dashboard page stays as-is — it remains useful (subscription, recent docs, profile completeness) but is no longer the landing page.

### 4. Profile-completeness nudge on CARA
If `company_profiles.company_name` is empty, show a small inline banner above the chat: "Add your company details so they appear on every document → Profile". Non-blocking.

### 5. Verification (preview browser, test account `casper@inreco.co.za`)
1. Sign in → lands on `/app` (CARA), not `/dashboard`.
2. Tap each of the 10 topic chips → instant knowledge-base answer + correct "Create document" button where applicable.
3. Type a question covered by knowledge base → no AI call (check network tab).
4. Type an off-topic labour question → AI fallback streams an answer.
5. Click "Generate Docs" in header → generator. Click "Dashboard" → existing dashboard. Click Home icon → back to CARA.
6. Save company profile → returns to `/app`.
7. Run security scan, confirm no new criticals.

## Out of scope
- Persisting chat history to the database (in-memory only for v1).
- Redesigning the existing Dashboard or Generate pages.
- Adding new document templates beyond the existing six.
- Multi-language CARA.

## Technical notes
- CARA uses the existing `AppShell` so the back button, footer legal links, and report-problem button stay.
- Knowledge base lives in source (TypeScript) — no DB needed, ships with the app, free to query.
- AI edge function uses Lovable AI Gateway (no user-provided key required) and `stepCountIs(50)` per AI SDK guidance.
- "Look in the app brain first" is enforced in `router.ts` — the AI call is literally unreachable unless knowledge + templates both miss.

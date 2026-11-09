## Presentation
- Conversation examples use paired semantic bubble foreground/background classes, never inline colors, so theme changes preserve readable contrast.
- Global heading styles define typography only; page-level semantic foreground utilities control color so headings remain readable on both light and branded surfaces.
- Installation invitations open the shared shortcut-choice page, whose manifests share the same identity and launch address; choosing an icon reloads that page before browser installation evaluation to avoid using a previously captured prompt.
- Subscriber offer rules live in supabase/functions/_shared/offers.ts with an identical copy in src/lib/offers.ts; the server re-checks eligibility at checkout so the app can never grant a discount itself.
- Industry knowledge for CARA lives in supabase/functions/_shared/industry/ (one pack per agreement, added to the prompt only when the company's industry or the question matches); the matcher has an identical copy in src/lib/industryMatch.ts so the app sends those questions to the adviser — keeps prompts small for everyone else.

- Curated 2026 legal facts and deterministic answers are mirrored between `_shared/legal2026.ts` and `src/lib/cara/legal2026.ts`; tests enforce parity so local and online advice agree.
- CARA checks the owner profile industry and built-in legal answers before model calls; built-in server responses require entitlement but not AI quota/key, so zero-credit guidance never unlocks expired accounts.

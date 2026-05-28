## How I looked at this

I walked the legacy app shell (`index.html`), the React surfaces (`/account-app/profile`, `/account-app/documents`, `/d/:token`, `/contact`, `/pricing`), and traced the main user journeys: sign up → pick a chip → wizard → advice → document → share. Below are the friction points I'd address, ranked by impact vs. effort. **Pick the ones you want and I'll ship them — don't need to do all of these.**

## Tier 1 — quick wins (low risk, high impact)

1. **Confirm `alert()` / `confirm()` replaced with in-app toasts.**
   Right now errors, "Remove team member?", "Remove device?", brand-warning failures all use native browser dialogs. They look broken on mobile PWAs and break flow. Use the existing toast system (Sonner is already loaded for React routes; add a tiny `toast()` helper in the legacy script).

2. **Loading states on every async button.**
   "Get CARA's Advice", "Generate PDF/Word", "Send invite", "Save profile", PayFast checkout — most don't disable + show a spinner while waiting. Users double-click and trigger duplicates. One small `setBusy(btn, true/false)` helper covers it.

3. **Empty / first-run guidance.**
   The chat screen drops a signed-in user straight onto a wall of 10 chips. Add a one-line "Tap a topic to start, or type your question below" hint plus a single "Try an example" chip that fills the input with a sample question. New users currently freeze.

4. **Wizard required-field hinting.**
   Submit silently fails when a required radio isn't picked. Show a soft red outline + "Please answer this" near the offending field instead of relying on the browser's tooltip.

5. **Connection / offline banner.**
   If `navigator.onLine === false` or the edge function errors, show a sticky banner: "Offline — your last message will retry when reconnected." Currently a failed AI call just shows nothing.

## Tier 2 — flow improvements

6. **Resume an in-progress matter on reload.**
   `currentMatter` and `wizardDrafts` live in memory only. Save them to `localStorage` keyed by user, so closing the browser/PWA tab doesn't lose the matter. Auto-restore on next sign-in with a "Resume your last matter?" prompt.

7. **Document history shortcut from chat.**
   After a download, surface a "View all your documents →" link that opens `/account-app/documents` in the **same tab** (current pattern opens new tabs that lose session on preview, same root cause as the company-profile bug we just fixed).

8. **Account / profile menu consolidation.**
   Today the header has Home, install, sign-out, badge — and the side actions (Company profile, Generated documents, Team, Subscription) live in a modal. Move them into a single dropdown (avatar + email) so users find them without hunting. Sign-out moves into the same dropdown.

9. **Inline plan picker when free tier hits zero.**
   The trial badge shows "∞" or a number, but when usage hits 0 we open the upgrade modal. Show remaining count inline with a soft warning at 1 left ("1 free question left — upgrade to keep going") so the upgrade isn't a surprise.

10. **Company profile completeness meter.**
    On `/account-app/profile`, show a small "Profile 60% complete — add a logo and signatory to finish" bar. Drives the data we actually need for branded docs.

## Tier 3 — polish

11. **Keyboard support.** Esc closes any open modal (wizard, document, brand panel, nav confirm). Enter on a chip = activate. Currently inconsistent.
12. **Mobile bottom-action safety.** PDF/Word buttons sit below the editable textarea on small screens — content can scroll the buttons off. Stick them to the modal bottom.
13. **Share-link clarity.** When generating a doc, tell the user it expires in 7 days (already in DB) before they share it.
14. **A11y labels.** Many `icon-btn`s have `aria-label`, but the chips and dynamic close buttons don't.
15. **Long AI replies.** Add a "Copy reply" affordance on every bot message, not just generated documents.

## Out of scope (intentionally)

- Visual redesign / theming.
- Backend schema changes — none required for any of the above.
- Pricing/PayFast flow rewrite.

## What I need from you

Tell me **which numbers to do**. My suggestion if you want a focused next sprint: **1, 2, 3, 6, 8** — biggest day-to-day wins for the least change.

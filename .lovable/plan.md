## Problem

`app.inreco.co.za` serves the landing page from `index.html`. The three "Get Started Free" / "Open iNRECO Free" buttons on that landing page link out to `https://inrecoapp.inreco.co.za`, which just resolves back to the same landing page — so clicking them appears to do nothing.

The signup/login/onboarding/app screens already exist inside the same `index.html` and are shown via `showScreen('signup' | 'login' | 'app')`. The external links should instead trigger that in-app flow.

## Fix

In `index.html`, replace the three external anchors with buttons that call `showScreen('signup')` — same approach already used at line 602.

- Line 405 — hero "Get Started Free"
- Line 511 — pricing card "Get Started Free"
- Line 587 — CTA section "Open iNRECO Free"

Keep label text, arrow icon, and existing CSS classes (`btn-primary`, `btn-price`) unchanged so visuals match exactly. Change `<a href="https://inrecoapp.inreco.co.za" class="...">…</a>` to `<button type="button" class="..." onclick="showScreen('signup')">…</button>`.

Result: clicking Get Started anywhere on the landing page opens the in-app Sign Up screen → Onboarding → CARA chat, all on `app.inreco.co.za`.

No other files touched. No styling, layout, copy, or other behavior changes.

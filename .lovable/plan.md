# Rebuild the iNRECO landing page around CARA

The developer's feedback is right on the main point: the site sells the technology, not the outcome. The fix is a rewrite of the public landing page (and the advert page) so a visitor understands the whole product in about 30 seconds, sees CARA actually working, and trusts us with staff information.

Nothing inside the paid app changes: payments, trials, documents, admin and the CARA app itself stay exactly as they are.

## New homepage order

```text
1  Hero        Have a labour problem? Ask CARA.
2  Meet CARA   Who she is, in her own words
3  See CARA work   A real conversation, shown on screen
4  What do you need help with?   Six real situations
5  What CARA does for you   Documents, deadlines, warnings, guidance
6  A real problem, solved in minutes   The sick-note story, start to finish
7  Your information stays protected   Security and human judgement
8  Pricing     Who each plan is for
9  Start your 7-day free trial
```

## Section by section

**1. Hero.** New headline: "Have a labour problem? Ask CARA." Sub-line: "Your AI labour adviser, on your phone, day and night. Tell CARA what happened — she asks the right questions, warns you about the risks, tells you what to do next and writes the letters." Buttons stay: start free trial, and try CARA free. Industry picker (restaurants / supermarkets) stays and keeps swapping the wording.

**2. Meet CARA.** A short, warm introduction in her voice: "Tell me what happened. I'll help you work out what to do next."

**3. See CARA work.** A scripted, animated chat panel showing a real exchange — employee absent three days, CARA asking whether they were contacted, then giving the next step and offering the letter. Built with the site's own chat styling so it looks exactly like the product. Plus real screens of asking CARA, generating a document, a risk warning and a deadline.

**4. Use cases.** Six tappable cards: misconduct, AWOL, disciplinary hearing, CCMA, retrenchment, grievance. Each opens the free-answer page with that question already filled in, so a visitor gets a real answer immediately.

**5. What CARA does.** Same features, human wording: "Get the document you need", "Before you make a costly mistake", "We'll guide you through it", "Never miss a CCMA date".

**6. Sick note as a story.** Same content, re-told as four steps from suspicious note to charge sheet, moved below the use cases.

**7. Trust.** New section: what is encrypted, how personal information is handled under POPIA, who on your team can see what, what the audit trail records, and a clear line that CARA supports your judgement rather than replacing legal advice.

**8. Pricing.** Same prices. Each plan gets a "who it's for" line: Solo — owners and managers; Business — small HR teams; Professional — growing organisations; Enterprise — HR departments and multi-site businesses.

**9. Honest claims.** Every "Always compliant" becomes "Practical guidance to help you handle labour matters correctly." Removes the clash with the not-legal-advice disclaimer.

## Also updated

- The advert page (the free-answer page people land on from Facebook) gets the same headline, the six situation buttons and a short trust strip, so the advert, the page and the app all say the same thing.
- Page title and description updated to the new outcome wording.

## Technical notes

- Main edit is `index.html` (the public marketing page): hero copy, section order, new CARA demo, use-case grid, trust section, pricing sub-labels, and removal of "Always compliant" from the default and both industry variants.
- The demo conversation is scripted static markup plus a small typing animation — no calls to CARA and no cost.
- Use-case cards deep-link to `/get?q=...`; `src/pages/GetApp.tsx` reads that and asks the question straight away, reusing the existing free-answer path and funnel tracking.
- Screenshot images for the "see it in action" strip are generated to match the real interface.
- No changes to payments, trials, database, admin or document generation.

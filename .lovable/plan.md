
## Goal

Teach CARA two new bodies of knowledge so it can answer accurately (with exact official links, no guessing):

1. Every online tool listed on **www.labour.gov.za/Online-Tools** (uFiling, Employment Equity online reporting, Compensation Fund / CompEasy, Public Employment Services / ESSA, complaints/inspection, trade union registration, etc.).
2. The **Employment Services Amendment Bill, 2026** (B 16—2026, Gazette 54743 of 26 May 2026) — what it changes, who it affects, and the practical impact for employers of foreign nationals.

## What CARA will do differently

- Users can search or tap topics like "UIF (uFiling)", "Report to Compensation Fund", "Register vacancies (ESSA)", "Employment Equity report" and get: what it is (plain language) → who uses it → the exact official URL → what documents/deadlines apply.
- A new "Foreign nationals" sub-topic will warn about the **Employment Services Amendment Bill 2026**: skills transfer plans, ministerial quotas per sector, offences, and that the Bill is not yet in force (starts on a date the President proclaims). CARA will keep giving current-law guidance and flag the coming changes.
- The AI fallback (`cara-chat`) is told to prefer the built-in links and never invent government URLs.

## What we'll build

**1. New knowledge entries in `src/lib/cara/knowledge.ts`**
- One consolidated topic **"Government online tools & services"** listing every tool with its official link, purpose, and when-to-use note.
- Individual sub-topics for the biggest ones so searches like "uFiling", "Compensation Fund claim", "Employment Equity report", "register a vacancy", "report unfair labour practice" match directly.
- One topic **"Employment Services Amendment Bill 2026"** summarising: new definitions (worker, asylum seeker, refugee, illegal foreigner), skills transfer plans, quotas for foreign nationals, exemptions, offences, effective date rule.
- Cross-links: the existing "Foreign nationals" topic gets a "Coming law change" note pointing to the Bill topic.

**2. New capsule on the CARA page (`src/pages/Cara.tsx`)**
- Add a "Government tools & links" capsule (same expandable style as the AARTO and Foreign Nationals capsules) so users can find them without needing to search.
- Add a small "Coming law change: Employment Services Amendment Bill 2026" line inside the Foreign Nationals capsule that opens the new topic.

**3. Update `cara-chat` system prompt (`supabase/functions/cara-chat/index.ts`)**
- Add rules: "When answering about UIF, Compensation Fund, Employment Equity, ESSA, or any Dept of Employment and Labour online tool, use only the official URLs supplied in the grounding; do not invent URLs." and a short summary of the Amendment Bill so the AI stays consistent when a user asks a nuanced question.

**4. New downloadable reference (optional but useful)**
- Save the uploaded Bill as a bundled asset so CARA can offer a "Download the Bill" link inside the topic.

## What we will NOT change

- No database changes, no new tables, no edge functions beyond the `cara-chat` prompt tweak.
- No template/document changes — this is knowledge only.
- No changes to pricing, admin, or partner flows.

## Sources

- All labour.gov.za entries will be sourced from the live pages (a background research task is already collecting them from `https://www.labour.gov.za/Online-Tools` and each linked sub-page). Only tools actually listed on those pages will be included — nothing invented.
- The Bill entry will be based on the uploaded PDF (Employment Services Amendment Bill, 2026 — B 16—2026, Gazette 54743 of 26 May 2026).

## Verification before we call it done

- Build passes.
- On the CARA page, searching "uFiling", "Compensation Fund", "Employment Equity", "vacancy", "amendment bill" each returns the right entry with a clickable official link.
- The Foreign Nationals capsule shows the "Coming law change" note.

### Technical notes
- File: `src/lib/cara/knowledge.ts` — add `KnowledgeTopic` entries with `label`, `keywords`, `summary`, `steps`, and a new optional `officialLinks: {label,url}[]` rendered by the router.
- File: `src/lib/cara/router.ts` / `src/pages/Cara.tsx` — render `officialLinks` as underlined anchor tags (target `_blank`, `rel="noopener"`).
- File: `supabase/functions/cara-chat/index.ts` — append rules and Bill summary to `SYSTEM_BASE`; redeploy.

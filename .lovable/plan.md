# Why nobody signs up — and how to fix the landing step

## What the numbers actually say

From your own live data (last 7 days) plus the Meta figures:

```text
1 141 video views
     83 clicks to the link          (7% — that part is fine)
    147 people opened /get          (ads are working)
     31 reached the sign-in screen  (79% left before that)
     20 looked at plans
      2 created an account
```

The ads are not the problem. The video sells well and people click. **The page they land on is where you lose 4 out of 5 of them.**

## Why /get loses them

The advert promises "instant labour answers on your phone". The page they land on delivers none of that. It shows an app icon, a description, and then asks them to do two chores before they get anything:

1. "Install the app" — a strange, slightly scary ask from a stranger's link (this is also what triggers those phone warnings people complained about).
2. "See plans & start" — the word *plans* means *price* means *card*, and they are gone.

There is no answer, no proof, no reason to trust you, and three screens between the click and any value: /get to /pricing to /auth to the app. Every extra screen roughly halves the number of people left.

## The fix: give the answer first, ask for nothing

### 1. Rebuild /get as an "ask a question now" page
Top of the page, above everything: a question box with the exact promise from the advert — *"Ask a South African labour question. Free, right now, no account."* Three tappable example questions (dismissal, sick note, notice pay) so a nervous person can tap instead of type.

They get a real CARA answer on that same page. That is the moment they believe you.

### 2. Only then ask for anything
Under the answer: *"Want the full answer, warning letters and contracts? Create your free account — 7 days free, no card."* One button. Email and password only. Their question follows them into the app (this already works).

Install becomes a quiet third option lower down, not the first thing a stranger sees.

### 3. Cut the plans page out of the free path
Anyone arriving from an advert goes advert to answer to sign-up to app. No pricing screen at all until day 5 of the trial. People who want to buy immediately still have a "See plans" link.

### 4. Make the promise match the advert word for word
The advert says "instant answers for 259 rand a month". The page should repeat that line and the price openly, plus one line of reassurance: no card for the free week, cancel anytime, and who you are (a real South African labour consultant, not an anonymous app).

### 5. Proof on the page
Short trust strip: what CARA is built on (BCEA, LRA, CCMA rules), the document list, and a small "made in South Africa" line. Add one screenshot of a real answer and one of a generated warning letter.

### 6. Measure it properly
Record each step separately (landed, asked a question, saw an answer, tapped sign-up, finished sign-up) so next week you can see exactly which step still leaks instead of guessing.

## On spending money on two apps

I would not judge either app on this data yet, because nothing has actually been tested — 147 people have seen one weak page. Fix that page, run the same advert for a week, and you will have a real answer. If a page that gives a free answer on arrival still converts under about 3%, the problem is the offer or the audience, and then it is a fair question whether to keep funding both.

## Technical notes

- Rewrite `src/pages/GetApp.tsx` into a conversion landing page reusing the existing guest CARA path from `src/pages/GuestPreview.tsx` (one free answer from built-in knowledge, no auth, no cost).
- Guest question already persists via `saveGuestDraft` in `src/lib/appLaunch.ts` and replays in `src/pages/Cara.tsx` — reuse unchanged.
- Sign-up CTA links straight to `/auth?plan=solo&trial=1`, bypassing `/pricing`; `InstallCta` demoted below the fold.
- Extend `usePageView`/`page_views` with a lightweight event name so funnel steps are queryable; no schema redesign, one nullable column.
- No changes to payments, trials, admin or document generation.

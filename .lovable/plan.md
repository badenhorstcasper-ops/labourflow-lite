## Short answer

Yes — easily, and with no new subdomain and no new hosting setup.

## How it works in plain words

Right now you have one landing page living at `app.inreco.co.za` (that's the home page file, `index.html`).

Instead of building two whole new pages, we let that same page also answer at two extra web addresses:

- `app.inreco.co.za/restaurants`
- `app.inreco.co.za/supermarkets`

When someone opens one of those addresses, the page loads exactly as it does today — same buttons, same subscription tiers, same free-trial links, same install and share buttons, same sign-up flow — but before it appears on screen it quietly swaps a handful of things for the industry version:

- the big headline and the sentence under it
- the badge line at the top
- the three or four main pictures
- the "common questions" section (industry-specific Q&A)
- one short industry example block (e.g. late-night shift no-shows for restaurants, till shortages and stock loss for supermarkets)

Everything else stays identical, because it literally is the same page. Nothing can drift out of sync later.

No sign-in or subscription is needed to view them — they're open to the public, just like the current landing page.

## Your ad links and share buttons

- Put `https://app.inreco.co.za/restaurants` (or `/supermarkets`) straight into your ads. Visitors land on the industry page and from that point everything behaves exactly as it does now.
- The share buttons on those pages will share that same industry address, so a restaurant owner passing it to a friend sends the restaurant version.
- The WhatsApp/Facebook link preview (little picture and text when the link is pasted) gets its own industry wording too.
- Links from the main landing page: I'll add two small buttons — "I run a restaurant" and "I run a supermarket / retail store" — near the top so visitors can jump to their version.

## What I'll build

1. Tell the app that `/restaurants` and `/supermarkets` are home-page addresses, not app addresses, so the marketing page loads there (in `src/main.tsx` and the small route check inside `index.html`).
2. Add one small block of content inside `index.html` holding the industry wording, questions and picture choices, plus the few lines that swap them in based on the address.
3. Generate the industry pictures (restaurant kitchen/front-of-house scenes, supermarket floor/till scenes) in the same style and brand colours as the current ones.
4. Write the industry Q&A — roughly six questions each, using real South African labour situations for that trade.
5. Check both new pages on a laptop-size and a phone-size screen: every button, the trial and pay links, install, share, and the footer links.

## Technical notes

- Route ownership: `LEGACY_ROUTES` in `src/main.tsx` and `window.__IS_REACT_ROUTE__` in `index.html` both get the two new paths added so React doesn't take over and show "page not found".
- Lovable hosting already serves `index.html` for unknown paths, so no redirect file or hosting config is needed.
- Content swap runs before first paint (inline, top of the page) so there's no flash of the generic text.
- Share URL logic in the share button reads the current address, so it inherits the industry path automatically; referral `?ref=` codes keep working unchanged.

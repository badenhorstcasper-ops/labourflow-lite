# Add "Quick start: pick a template" button to CARA

## What changes
- On the CARA screen, next to the "Browse topics" area above the message box, add a full-width button: **Quick start: pick a template** (document icon, 56px tall, same style as the other CARA controls).
- Tapping it opens the Home screen and scrolls straight to the "Quick start: pick a template" list, so the person sees the templates right away instead of the top of Home.
- Nothing else on CARA changes. It still works the same for guests: if someone isn't signed in, the existing sign-in step comes first, then they land on the template list.

## Technical details
- `src/pages/Cara.tsx`: add a `Link` to `/dashboard#quick-start` placed with the `TopicBrowser` (around line 323), as a secondary button.
- `src/pages/Dashboard.tsx`: give the Quick start card `id="quick-start"` and, after the page loads, scroll to the matching section when the address ends in `#quick-start`.
- Check at 390x844: the button shows without crowding the message box, and tapping it lands on the template list.

## What I will fix

The top row of links will behave like this:

- **Laptop / PC / tablet:** the link row is centered across the screen and lines up neatly with the page width.
- **Phone:** the link row becomes a simple sideways-scroll row, so the links do not squash, wrap awkwardly, or run off the screen.
- **No link or page behaviour changes:** this is only a visual layout fix.

## Exact change

In the shared app header (`src/components/AppShell.tsx`):

1. Keep the Back / Home / iNRECO group separate from the link banner.
2. Put the link banner in its own centered row on medium and large screens.
3. On phones, make that same link banner a horizontal scroll strip.
4. Remove the current right-aligned desktop behaviour that makes the links look pushed to the side.

## How I will check it

I will check the header at:

- **Desktop / laptop width** — links centered.
- **Tablet width** — links centered or neatly wrapped if needed.
- **Phone width** — links scroll sideways only.

The result should match what you asked for: centered on bigger screens, scrollable only on smaller screens.
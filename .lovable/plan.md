## Goal
On the `/restaurants` industry landing page, swap the generic/corporate images in the **"How It Works"** and **"Why iNRECO"** sections for visuals that clearly read as South African restaurant, café, or takeaway operations.

## Current state
- The landing page is a single `index.html` file. Industry pages (`/restaurants`, `/supermarkets`) reuse the same HTML and swap only the hero image, title, badge, subtitle, and FAQ list via a small inline JS config object (`INDUSTRIES`).
- The images to replace are:
  1. **How It Works** — `inreco-how-it-works.jpg` (currently a corporate/logistics-style shot).
  2. **Why iNRECO** — two stacked images: `inreco-why-a.jpg` and `inreco-why-b.jpg`.
- These image references are hardcoded in `index.html` and are not yet part of the industry swap logic.

## Plan

### 1. Generate new restaurant-specific images
Generate three new images using the image generation tool:
- **How It Works** (`inreco-how-it-works-restaurant.jpg`): A South African restaurant manager or owner using a phone/tablet on the restaurant floor or near the pass, with the warm bustle of a kitchen or service area in the background. Should feel practical and operational, not posed/corporate.
- **Why iNRECO — top** (`inreco-why-restaurant-a.jpg`): A busy South African restaurant/café interior or front-of-house scene — staff serving, tables, coffee machine, POS/till. Should convey "this is built for my business."
- **Why iNRECO — bottom** (`inreco-why-restaurant-b.jpg`): A close-up of a restaurant owner/manager reviewing something on a phone at a table or counter, with a relaxed but professional vibe.

All three should match the existing dark blue brand palette and realistic photographic style, and should not contain text.

### 2. Upload images as Lovable assets
Use the `lovable-assets` CLI to upload the generated files and create `.asset.json` pointer files under `src/assets/`. Then remove the original generated files from the repo (only the pointer files remain).

### 3. Wire the images into the industry swap script
Update the inline `INDUSTRIES` JavaScript in `index.html` for `/restaurants`:
- Add new keys: `howItWorksImg`, `whyImgA`, `whyImgB` (or similar).
- In the `DOMContentLoaded` handler, look up the relevant `<img>` elements by ID or class and replace their `src` and `alt` attributes when the current path is `/restaurants`.
- Add `id` attributes to the three target `<img>` tags if they do not already have them, so the JS can target them reliably.
- Keep the existing default images for `/supermarkets` and the base `/` landing page unchanged.

### 4. Update alt text
Make alt text specific to restaurants, e.g.:
- How It Works: "Restaurant owner getting a labour-law answer from iNRECO during service."
- Why A: "Busy South African restaurant floor — the kind of workplace iNRECO is built for."
- Why B: "Restaurant manager checking iNRECO on his phone between shifts."

### 5. Verify
- Preview the `/restaurants` page at mobile and desktop widths to confirm the new images load and the layout still stacks correctly.
- Confirm `/supermarkets` and `/` still show the original images.

## Files to change
- `index.html` — add restaurant image assets to the industry swap script and add targetable IDs to the three image tags.
- `src/assets/inreco-how-it-works-restaurant.jpg.asset.json` — new asset pointer.
- `src/assets/inreco-why-restaurant-a.jpg.asset.json` — new asset pointer.
- `src/assets/inreco-why-restaurant-b.jpg.asset.json` — new asset pointer.

## Out of scope
- No changes to pricing, hero image, FAQ copy, or navigation.
- No changes to `/supermarkets` or the base `/` page images.
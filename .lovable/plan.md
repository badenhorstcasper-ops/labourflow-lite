## Goal

Right now the app blocks you: if a form field is marked with a star, you cannot press "Generate document" until it is filled in. You should be able to get any document as a blank, printable template (with lines to fill in by hand) whenever you want.

## What changes for the user

On the "Generate a document" screen:

1. Every template card gets a second small button: **"Blank template"** — one tap gives you the document with empty lines, no form to complete.
2. Inside a template form, a new button next to "Generate document": **"Generate blank template"**. Anything you have already typed is kept; everything you left empty becomes a fill-in line.
3. The star (required) rule only applies to the normal "Generate document" button. It no longer stops the blank route.
4. A one-line note under the form: "Tip: you can create this as a blank form and fill it in by hand or later on your computer."

Everything else stays the same — the document still carries your company branding, a document number, is saved to Documents, and gets a share link.

## Technical notes

- `src/pages/Generate.tsx`
  - Add `onGenerateBlank()` which skips the `missing` required check and calls `tpl.build(blankValues)`.
  - `blankValues` = current `values`, with every template field key that is empty filled with a placeholder: text/textarea/date → `"____________"`, select → the empty string so the builder's own default wording applies (already handled, e.g. `v.level || "Written"`).
  - Add a `blank=1` search param so the picker card's "Blank template" button opens the form and immediately runs the blank generation once.
  - Title of blank output gets no subtitle change; body already tolerates empty values because helpers (`fmtDate`, `paragraphs`) fall back to lines/omission.
- `src/lib/documents/templates/index.ts` — small helper export `blankValuesFor(def)` so both entry points share one rule; no change to any existing builder.
- No database, storage or edge-function changes.

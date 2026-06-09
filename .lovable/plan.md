## Problem

PDF generation crashes with `WinAnsi cannot encode "_" (0x2500)`. Despite the label "_", `0x2500` is actually the Unicode **box-drawing horizontal line** character `─`. The standard Helvetica font in `pdf-lib` only supports the WinAnsi character set, so any box-drawing glyph, smart quote, em-dash, non-breaking space, bullet variant, etc. that sneaks in from the source text (or from a copy/paste in the legacy app) blows up the whole render.

DOCX has no such restriction, which is why Word output works fine.

## Fix

One small, contained change in `src/lib/documents/renderPdf.ts`: sanitize every string the moment before it's handed to `page.drawText` / `font.widthOfTextAtSize`, mapping known troublemakers to safe WinAnsi equivalents and stripping anything else that's still out of range.

### Mapping table (common offenders)

| Char(s) | Code | Replacement |
|---|---|---|
| `─ ━ │ ┃` and other box-drawing | U+2500–U+257F | `-` (horizontal) / `|` (vertical) |
| `– —` en/em dash | U+2013/2014 | `-` |
| `' ' ‚ ‛` smart single quotes | U+2018/2019/etc | `'` |
| `" " „ ‟` smart double quotes | U+201C/201D/etc | `"` |
| `… ` ellipsis | U+2026 | `...` |
| `• ‣ ◦` bullets | U+2022/etc | `•` is actually in WinAnsi (0x95), keep; map the rest to `*` |
| ` ` non-breaking space | U+00A0 | regular space |
| `→ ← ↔` arrows | U+2190+ | `->` `<-` `<->` |
| `✓ ✗` checks | U+2713/2717 | `[x]` / `[ ]` |
| Anything else > U+00FF still unsupported | — | drop with empty string (last-resort) |

### Where it applies

A single `sanitizeWinAnsi(s: string)` helper added at the top of `renderPdf.ts`, then called in exactly these spots so nothing slips past:

1. `wrap()` — incoming `text`
2. `drawText()` — incoming `text` (covers title, subtitle, headings, footer page label)
3. `runsToWords()` — `r.text` for every inline run (covers justified paragraphs + bulleted lists)
4. `drawRunsLeft()` prefix strings (`"•  "`, `"   "`) — already safe, no change needed
5. Header text: `name`, `trading`, `meta`, `Doc #`, `Date`
6. Footer: `companyFooterLine(company)`
7. Signature labels and names

Doing it inside the low-level draw helpers (1–3) catches the vast majority automatically; 5–7 are belt-and-braces for company/signature fields that bypass those helpers.

### Out of scope

- No change to `clientEntry.ts` (parser stays as is — DOCX should keep the original Unicode).
- No change to `renderDocx.ts` (Word handles Unicode natively).
- No embedded custom Unicode font — that would balloon the PDF size for what is, in practice, a handful of stray glyphs from pasted text.
- No change to the legacy input format or to the markdown parsing fix from the previous round.

## Files touched

- `src/lib/documents/renderPdf.ts` — add `sanitizeWinAnsi()` helper and call it from the draw helpers + header/footer/signature spots listed above.

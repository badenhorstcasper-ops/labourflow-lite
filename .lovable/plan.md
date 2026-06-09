## Problem

The legacy app passes markdown-style text (`**bold**`, `---` rules, `**HEADING**` lines) into the document renderer. Today the renderer treats it as plain text, so `**` literally prints around every heading and emphasised phrase, and `---` shows as three dashes. Paragraphs are also only left-aligned, which looks less formal than the warning letter calls for.

## Fix

Three small changes, all in the document pipeline. No behaviour changes elsewhere.

### 1. Parse markdown markers — `src/lib/documents/clientEntry.ts`

In `textToBlocks`:
- Treat a line that is entirely wrapped in `**...**` (optionally with a leading number like `**1. NATURE OF MISCONDUCT**`) as a **heading** block, with the `**` stripped.
- Treat a line that is just `---` or `___` as a **spacer** block (currently it prints literally).
- For paragraph and list text, split on `**...**` into inline segments tagged `{ text, bold }`. Store as a richer block shape: `{ kind: "p", runs: Run[] }` and `{ kind: "list", items: Run[][] }`. Keep the old `text`/`items: string[]` shapes too so any other caller keeps working — renderers will prefer `runs` when present.

### 2. Inline bold + justified paragraphs — `src/lib/documents/renderDocx.ts`

- For `kind: "p"` paragraphs: add `alignment: AlignmentType.JUSTIFIED` and emit one `TextRun` per segment (`bold: true` when the segment was wrapped in `**`).
- For `kind: "list"` items: same per-segment runs (no justification — bullets read better left-aligned).
- Headings: unchanged styling, just use the cleaned text.

### 3. Inline bold + justified paragraphs — `src/lib/documents/renderPdf.ts`

- Extend the line-wrapper so it accepts `Run[]` and lays out words while tracking which font (regular vs bold) each word uses.
- For body paragraphs, after wrapping into lines, render each non-last line **justified**: compute leftover width and distribute it evenly across the gaps between words (skip lines with only one word, and skip the final line of each paragraph — standard print justification).
- Lists and headings stay left-aligned; only `kind: "p"` body paragraphs are justified.

## Out of scope

- No change to the legacy app's input format — it can keep sending markdown-flavoured text.
- No change to colours, layout, header/footer, or signature blocks.
- No DB / storage / auth changes.

## Files touched

- `src/lib/documents/clientEntry.ts` — parser
- `src/lib/documents/types.ts` — extend `DocBlock` with optional `runs`
- `src/lib/documents/renderPdf.ts` — inline bold + justification
- `src/lib/documents/renderDocx.ts` — inline bold + justification

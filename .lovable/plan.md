# Plan: Fix duplicate `escapeHtml` declaration in `index.html`

## Problem
`index.html` contains the same `escapeHtml` function declared twice:
- Line 1556 (primary)
- Line 2041 (duplicate, functionally identical)

Because the file uses `import` at the top, esbuild treats the inline script as an ES module. ES modules forbid duplicate top-level function declarations, so the dev-server logs:
```
The symbol "escapeHtml" has already been declared
```

## Fix
Delete the duplicate declaration on line 2041. The remaining declaration at line 1556 covers all call sites (lines 1559, 1570, 2007, 2032, 2041's local users).

That's it — one-line removal, no other edits, no behavioural change.

## Verify
- After the edit, watch `daemon_logs` for the `esbuild` error to disappear.
- Reload the preview at `/` and confirm the landing page still renders.

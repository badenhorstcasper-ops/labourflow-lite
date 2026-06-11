## Root cause

On the live site, navigating to `/terms`, `/privacy` or `/disclaimer` shows only the yellow test banner and the footer — the React legal page never mounts (confirmed by browser screenshot + console error `Uncaught Error: react-route`).

The legacy app's inline `<script type="module">` in `index.html` (around line 826) currently does:

```js
const p = window.location.pathname;
if (p.startsWith('/d/') || p.startsWith('/account-app') || ... || p === '/disclaimer') {
  throw new Error('react-route');
}
```

…to skip the legacy bootstrap on React routes. This works in the Vite dev server (preview) because each inline module is served as its own ES module. But Vite's **production build bundles every `<script type="module">` (the inline legacy bootstrap + `/src/main.tsx`) into a single chunk**. Confirmed by grepping the deployed bundle — the `throw new Error("react-route")` and the React mount code live in the same chunk. The top-level throw halts the entire chunk before `main.tsx` runs `shouldMountReact()` / `body.innerHTML = '<div id="root"></div>'`, so React never mounts on live.

## Fix

Replace the throw-to-bail pattern with a non-throwing guard so the chunk keeps evaluating and `main.tsx` can mount React.

1. In `index.html`, in the legacy inline `<script type="module">`, remove the `throw new Error('react-route')`. Instead, set a window flag and gate the legacy bootstrap's actual side-effects on it:

   ```js
   const __p = window.location.pathname;
   window.__IS_REACT_ROUTE__ =
     __p.startsWith('/d/') ||
     __p.startsWith('/account-app') ||
     __p.startsWith('/share/') ||
     __p === '/terms' || __p === '/privacy' || __p === '/disclaimer';
   ```

2. Find the legacy bootstrap's entry call (the `DOMContentLoaded` handler / `init()` invocation near the bottom of the inline module in `index.html`) and short-circuit it:

   ```js
   if (!window.__IS_REACT_ROUTE__) {
     // existing init / event wiring
   }
   ```

   Top-level `import` statements and pure function definitions stay as-is — they have no visible side-effects, so leaving them to evaluate on React routes is harmless.

3. Leave `src/main.tsx` unchanged — its `shouldMountReact()` check already covers `/terms`, `/privacy`, `/disclaimer`, and once the chunk stops throwing it will run normally and replace `document.body` with the React tree.

4. Verify after deploy: load `https://app.inreco.co.za/terms` — React legal page renders, no `react-route` error in console, and the in-app footer links navigate correctly.

No backend, schema, or React route changes are needed.

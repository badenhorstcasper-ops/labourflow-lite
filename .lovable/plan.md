## Plan

1. Extend the React bootstrap condition so the app also mounts on `/terms`, `/privacy`, and `/disclaimer`.
2. Keep the existing route components as-is, since the legal pages and links are already correctly defined in `src/App.tsx` and `src/pages/Legal.tsx`.
3. Verify in preview that clicking each footer link opens the matching legal page and that switching between those pages works.

## Technical details

- Update `src/main.tsx` so `shouldMountReact()` recognizes the three legal routes.
- Update the legacy route guard in `index.html` so the vanilla app does not try to own those same paths.
- No backend or database changes are needed.
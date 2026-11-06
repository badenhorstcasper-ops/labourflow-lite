# iNRECO Pocket Consultant

Live: https://app.inreco.co.za · Lovable project `566d6a2d-e8ae-42d8-a310-7a3da62a698c` · Supabase `riqswihuzclbyjemynyd`

## How the app is put together
- `index.html` is the legacy marketing page. It owns `/`, `/restaurants` and `/supermarkets` only.
  Every sign-up, log-in and chat button on it hands over to the React app.
- React (Vite + TS + shadcn) owns every other route (`src/main.tsx` → `shouldMountReact`).
- CARA:
  - Built-in guidance (topics, checklists, templates) runs in the browser (`src/lib/cara/*`) and works even when the AI is down.
  - Free-text AI answers go through the `cara-chat` edge function, which is billed to Lovable AI credits.
- Who may use what is decided in one place: `supabase/functions/_shared/entitlement.ts`. The UI uses it through `src/lib/entitlement.ts`, and the edge functions use it through `_shared/aiGuard.ts`.
- Payments run through PayFast:
  - `payfast-checkout` → `payfast-webhook` (ITN), plus `payfast-provisional-access` and `payfast-reconcile`.
  - The card-free 7-day trial is started by `start-trial`.

## Develop
```sh
npm install
npx vite build                       # skips the prebuild sitemap script
npx tsc -p tsconfig.app.json --noEmit
npx vitest run
deno check supabase/functions/<fn>/index.ts
```

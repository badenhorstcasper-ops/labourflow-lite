# Fix blank /pricing and /settings

## Root cause

The browser console shows the actual crash:

```
Error: supabaseUrl is required.
  at createClient (@supabase/supabase-js)
  at src/pages/Dashboard.tsx:25
```

Every page (`Dashboard`, `Pricing`, `TeamManagement`) calls `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)` at module load. Those env vars are empty — there is no `.env` in the project and no `src/integrations/supabase/client.ts`. Lovable Cloud is currently **not connected**, so the managed env file was never generated.

When `createClient` is called with an empty URL, it throws synchronously during module evaluation. React never mounts the route, so you get a blank white screen. `/` looks fine only because you haven't refreshed it since the last good build — refreshing it would also break.

The PayFast forms, `subscriptions` table reads, `team_members` table reads, and the `invite-team-member` / `payfast-webhook` edge functions all depend on the backend being live, so the right fix is to reconnect the backend, not to hide the error.

## Plan

1. **Enable Lovable Cloud.** This regenerates the managed `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, and reattaches the existing project (tables `subscriptions`, `team_members`, and edge functions `invite-team-member` + `payfast-webhook` should already be there from before).

2. **Add the canonical client at `src/integrations/supabase/client.ts`** (the standard Lovable Cloud pattern) and switch `Dashboard.tsx`, `Pricing.tsx`, and `TeamManagement.tsx` to import from it instead of each calling `createClient` themselves. This removes three duplicated init sites and prevents the same module-load crash if env ever drops again.

3. **Harden the client** so a missing URL logs a clear error and renders a friendly "Backend not connected" message instead of a blank screen — defensive only, not a substitute for step 1.

4. **Verify in the preview**: navigate to `/`, `/pricing`, `/settings`, `/payment-success`, `/payment-cancelled` and confirm each renders. Check the browser console is clean of the `supabaseUrl is required` error.

## Files touched

- `src/integrations/supabase/client.ts` — new, single source of truth
- `src/pages/Dashboard.tsx` — import shared client
- `src/pages/Pricing.tsx` — import shared client
- `src/components/TeamManagement.tsx` — import shared client

## Out of scope

- No changes to PayFast form fields, plan amounts, seat limits, or the team-invite flow logic.
- No changes to routing in `App.tsx` (routes are already correct).

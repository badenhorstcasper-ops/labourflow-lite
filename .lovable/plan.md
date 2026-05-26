## Plan: Add a Settings page with TeamManagement

This project currently has no settings/account page (only a placeholder Index). I'll add a minimal `/settings` route that renders the existing `TeamManagement` component.

### Changes

1. **Create `src/pages/Settings.tsx`**
   - Simple page with a heading "Account Settings"
   - A small "Current plan" section header
   - Renders `<TeamManagement />` (which itself displays current plan + seats + member list)
   - Uses semantic Tailwind tokens, container/spacing consistent with shadcn defaults

2. **Edit `src/App.tsx`**
   - Add `import Settings from "./pages/Settings.tsx";`
   - Add `<Route path="/settings" element={<Settings />} />` above the catch-all

### Not changing
- Index page, NotFound, TeamManagement component, styles, or navigation
- No new nav links added (per "do not change navigation"). Users reach it via `/settings`.

### Notes
TeamManagement requires `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` env vars and the `team_members` table/edge function from `docs/team-members.sql` to be deployed in your Supabase project — those are prerequisites already documented.

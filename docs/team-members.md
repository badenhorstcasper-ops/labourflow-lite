# Team Members (multi-user plans)

Drop-in artifacts for adding team management to the iNRECO app. Apply in the
real app project — this repo only ships the SQL, edge function, and React
component.

## 1. Apply the migration

Run `supabase/migrations/20260525000000_team_members.sql` once in the Supabase
SQL editor of project `ckjevliuwlijfvdjxmmp`. It creates:

- `public.team_members` (with RLS — owners manage their team, members can read
  their own membership row).
- Trigger `on_auth_user_created_link_team` that auto-links new auth users to
  any matching pending invite by email and flips them to `status = 'active'`.
- Helper `public.current_account_owner()` returning the owner's user id for
  the current session (own id if not a team member). Use this in RLS on
  plan-gated tables so members see the owner's data, e.g.

  ```sql
  using (owner_user_id = public.current_account_owner())
  ```

## 2. Deploy the edge function

`supabase/functions/invite-team-member` enforces seat limits from
`public.subscriptions.plan_name`, calls `supabase.auth.admin.inviteUserByEmail`,
and inserts the pending row. Requires the standard Supabase env vars
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) which are
provided automatically.

Seat limits: Solo 1, Business 5, Professional 10, Enterprise 15. The owner
consumes 1 seat.

## 3. Mount the React component

Copy `src/components/TeamManagement.tsx` into the app project and render it
inside the existing account/settings page:

```tsx
import { TeamManagement } from "@/components/TeamManagement";

<TeamManagement />
```

The component assumes a Supabase client at `@/integrations/supabase/client`.
Adjust the import if your client lives elsewhere.

## 4. Owner-only billing/invites

Billing and the invite UI must only render for the account owner. Gate them
with:

```ts
const { data: auth } = await supabase.auth.getUser();
const isOwner = auth?.user?.id != null && // signed in
  !(await supabase
    .from("team_members")
    .select("id")
    .eq("member_user_id", auth.user.id)
    .eq("status", "active")
    .maybeSingle()).data;
```

Members get the same in-app access through `current_account_owner()`-scoped
RLS, but never see the team management or billing sections.

Add "Signups in last 7 days" and "Signups in last 30 days" tiles to the Admin dashboard so you can check activity at a glance.

## Changes

1. **`supabase/functions/admin-stats/index.ts`** — When listing users via `admin.auth.admin.listUsers`, also compute counts where `created_at` falls within the last 7 and 30 days. Return them under `signups: { week, month }`.

2. **`src/pages/Admin.tsx`** — Add two new stat tiles ("Signups (7d)" and "Signups (30d)") next to the existing totals, reading from the new `signups` field.

No schema changes. No new dependencies.

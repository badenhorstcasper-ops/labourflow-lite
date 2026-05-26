## Goal

Implement the hybrid access model for paid plans:

- **Seats** — Business 5, Professional 10, Enterprise 15 (already in `SEAT_LIMITS`). Owner shares a **manual sign-up link**, no email delivery.
- **Device cap** — every account (owner *and* invited member) may have at most **2 active devices**. A 3rd device login is **blocked** with a clear error and a link to manage devices.
- Over-limit invites or devices are **rejected**, not auto-bumped.

Solo (1 user) gets the same 2-device cap. Starter (free) also gets 2 devices.

## Database (one migration)

1. **`team_members.invite_token`** — add `text unique not null default encode(gen_random_bytes(16),'hex')`. Backfill existing rows with a unique value.
2. **`team_members.accepted_at`** — `timestamptz`. Set by `accept_team_invite`.
3. **`user_devices`** table:
   - `id uuid pk`, `user_id uuid not null` (= `auth.uid()`), `device_id text not null`, `label text`, `user_agent text`, `last_seen_at timestamptz default now()`, `created_at timestamptz default now()`.
   - `unique (user_id, device_id)`.
   - RLS: owners (`auth.uid() = user_id`) can `SELECT`, `UPDATE` (label only), `DELETE`. No client `INSERT` — only the `register_device` function inserts.
4. **`public.register_device(_device_id text, _label text, _ua text)`** — `SECURITY DEFINER`, validates `auth.uid()` is set, upserts on `(user_id, device_id)` updating `last_seen_at`. If row is new and existing device count for the user is already ≥ 2, **raises** `EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'device_limit_reached'`. Returns the device row.
5. **`public.accept_team_invite(_token text)`** — `SECURITY DEFINER`. Looks up `team_members` by token. Refuses if accepted or revoked. Checks owner's plan via latest `subscriptions.plan_name` against `SEAT_LIMITS` (encoded inside the function). If under cap, sets `member_user_id = auth.uid()`, `member_email = auth.email()`, `status = 'active'`, `joined_at = now()`, `accepted_at = now()`. Raises `seat_limit_reached` or `invite_invalid` on errors. Returns `owner_user_id` + `plan_name`.
6. Keep the existing `link_team_member_on_signup` trigger — still useful when an invited person signs up later.

## App changes

### A. Device registration (both apps)
- Generate a stable per-browser id once: `localStorage["inreco.deviceId"] = crypto.randomUUID()`.
- After every successful sign-in (legacy `index.html` `afterLogin` and React `Auth.tsx` post-login), call `supabase.rpc('register_device', { _device_id, _label: <short device guess>, _ua: navigator.userAgent })`.
- On `device_limit_reached` error: `supabase.auth.signOut()`, show modal "This account already has 2 active devices. Remove one from Settings → Devices on another device, then try again." with a "Sign in on another device first" hint.

### B. Manual-link invites (replace email flow)
- `TeamManagement.tsx`:
  - Drop the `invite-team-member` edge function call. Instead, insert directly into `team_members` (owner-only RLS already allows this) with `member_email`, `status='pending'`.
  - After insert, build link `https://app.inreco.co.za/join?token=<invite_token>` and show it inline with a **Copy link** button and a hint: "Send this link to your teammate via WhatsApp/email. The link expires when the seat is filled."
  - Each pending row keeps its Copy-link / Remove actions.
  - Disable Invite button when `members.length + 1 >= seatLimit`.
- New React route `/join`:
  - Reads `?token=` from URL. Stores it in `localStorage["inreco.pendingInviteToken"]` and routes to `/auth` if not signed in.
  - After sign-in, calls `accept_team_invite(token)`. On success → toast "You've joined <Owner>'s team" → route to `/`. On `seat_limit_reached` → toast and explanation. On `invite_invalid` → toast.
  - `src/pages/Auth.tsx` already handles `pendingPlan` / `pendingEmail`; extend the same post-login hook to consume `pendingInviteToken` if present.

### C. Settings → Devices panel
- New `DevicesManagement.tsx` (rendered on Settings page next to `TeamManagement`).
- Lists rows from `user_devices` for the current user, shows label, UA, last seen. Current device is badged "This device".
- "Remove" button deletes the row (RLS allows it). Removing the current device also signs the user out.
- Header copy: "This account allows up to 2 active devices."

### D. Pricing / landing copy
- No price changes. Update the seat lines in `Pricing.tsx` and the marketing markup in `index.html` to say e.g. "Up to 5 registered users · max 2 devices each" so the rule is visible at sale time.

## Out of scope
- No email delivery, no edge-function changes (the existing `invite-team-member` function becomes unused; I'll leave it deployed but unreferenced — say the word if you'd like me to delete it).
- No changes to `subscriptions` schema or PayFast webhook.
- No "kick the oldest device" auto-bump — strictly blocked, per your choice.

## Open question

Should the device cap be **per individual account** (owner: 2, each invited member: 2 — so a Business plan effectively allows 5 × 2 = 10 devices total), or **shared across the whole subscription** (5 devices max for the entire Business team, regardless of who logs in)? Per-account is much simpler and what I planned above; shared-pool needs the device check to look up the owner via `team_members` and aggregate. Let me know if you want the shared-pool variant.

-- iNRECO Pocket Consultant — Nov 2026 hardening (prepared offline, NOT yet applied)
-- 1) ai_usage: metering for CARA AI chat + voice (server-side quotas)
-- 2) payfast_transactions.provisional_granted_at: closes the repeatable
--    "abandon PayFast -> provisional access" loophole
-- 3) expire_stale_trials(): marks trials that ended as 'expired' (daily cron)
-- Safe to run more than once.

-- 1) AI usage metering --------------------------------------------------------
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  owner_user_id uuid not null,
  kind text not null check (kind in ('chat', 'transcribe')),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_owner_kind_created_idx
  on public.ai_usage (owner_user_id, kind, created_at desc);
create index if not exists ai_usage_user_kind_created_idx
  on public.ai_usage (user_id, kind, created_at desc);

alter table public.ai_usage enable row level security;

-- People can see their own account's usage (for an "x of 50 used" meter).
-- Inserts happen only from edge functions with the service role (no insert policy).
drop policy if exists "Account members read own AI usage" on public.ai_usage;
create policy "Account members read own AI usage" on public.ai_usage
  for select to authenticated
  using (user_id = auth.uid() or owner_user_id = auth.uid());

drop policy if exists "Admins read all AI usage" on public.ai_usage;
create policy "Admins read all AI usage" on public.ai_usage
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Provisional-access bookkeeping ---------------------------------------------
alter table public.payfast_transactions
  add column if not exists provisional_granted_at timestamptz;

-- 3) Auto-expire stale trials --------------------------------------------------
-- A trial whose end date has passed (and that has no paid month running) is
-- marked 'expired' so admin stats and reminders stop counting it as a trial.
-- The app already treats an ended trial as locked; this just makes the data honest.
create or replace function public.expire_stale_trials()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  update public.subscriptions
     set status = 'expired',
         updated_at = now()
   where status = 'trialing'
     and trial_ends_at is not null
     and trial_ends_at < now() - interval '1 hour'
     and (paid_until is null or paid_until < now());
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.expire_stale_trials() from public, anon, authenticated;

-- Daily at 00:15 SAST (22:15 UTC). Unschedule first so re-running is safe.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expire-stale-trials-daily') then
    perform cron.unschedule('expire-stale-trials-daily');
  end if;
  perform cron.schedule('expire-stale-trials-daily', '15 22 * * *', 'select public.expire_stale_trials();');
end;
$$;

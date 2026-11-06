-- iNRECO Pocket Consultant — CCMA deadline tracker with reminders
-- (prepared offline, NOT yet applied). Run AFTER 20261106120000.
--
-- 1) ccma_matters: one row per tracked deadline, shared with the account's team
-- 2) ccma_compute_due_date(): server-side due date (mirrors
--    supabase/functions/_shared/ccmaDeadlines.ts — tested in src/test/ccmaDeadlines.test.ts)
-- 3) ccma_deadline_reminders: in-app reminder feed + email outbox (one row per stage)
-- 4) flag_ccma_deadline_reminders(): daily job that creates due reminders and
--    stamps ccma_matters.reminder_sent_at; pg_cron at 06:30 SAST
-- 5) pg_cron at 07:00 SAST calls the ccma-deadline-reminders edge function,
--    which emails pending reminders via the existing send-transactional-email queue.
-- Safe to run more than once. Guidance only — not legal advice.

-- 1) Matters --------------------------------------------------------------------
create table if not exists public.ccma_matters (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null default public.current_account_owner(),
  created_by_user_id uuid not null default auth.uid(),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  employee_name text check (employee_name is null or char_length(employee_name) <= 160),
  case_number text check (case_number is null or char_length(case_number) <= 80),
  dispute_type text not null check (dispute_type in (
    'unfair_dismissal', 'unfair_labour_practice', 'unfair_discrimination',
    'conciliation_period', 'arbitration_request', 'rescission', 'review_award', 'custom')),
  trigger_date date,
  custom_due_date date,
  due_date date not null,
  status text not null default 'open' check (status in ('open', 'done', 'withdrawn')),
  completed_at timestamptz,
  reminder_days integer[] not null default '{7,3,1}',
  email_reminders boolean not null default true,
  reminder_sent_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ccma_matters_dates_ck check (
    (dispute_type = 'custom' and custom_due_date is not null)
    or (dispute_type <> 'custom' and trigger_date is not null)
  )
);

create index if not exists ccma_matters_owner_status_due_idx
  on public.ccma_matters (owner_user_id, status, due_date);
create index if not exists ccma_matters_open_due_idx
  on public.ccma_matters (due_date) where status = 'open';

-- 2) Server-side due date ---------------------------------------------------------
-- Start date + period, first day excluded (dismissal 1 Nov + 30 days = 1 Dec).
-- The stored date is NOT extended for Sundays/public holidays: acting by it is
-- always safe. The app shows any possible extension as information only.
create or replace function public.ccma_compute_due_date(p_type text, p_trigger date, p_custom date)
returns date
language sql
immutable
set search_path = public
as $$
  select case p_type
    when 'unfair_dismissal'       then p_trigger + 30           -- LRA s191(1)(b)(i)
    when 'unfair_labour_practice' then p_trigger + 90           -- LRA s191(1)(b)(ii)
    when 'unfair_discrimination'  then (p_trigger + interval '6 months')::date  -- EEA s10(2)
    when 'conciliation_period'    then p_trigger + 30           -- LRA s135(2)
    when 'arbitration_request'    then p_trigger + 90           -- LRA s136(1)(b), s191(11)(a)
    when 'rescission'             then p_trigger + 14           -- CCMA Rules r32
    when 'review_award'           then p_trigger + 42           -- LRA s145(1)(a): 6 weeks
    when 'custom'                 then p_custom
  end;
$$;

create or replace function public.ccma_matters_before_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    -- Ownership never moves.
    new.owner_user_id := old.owner_user_id;
    new.created_by_user_id := old.created_by_user_id;
    new.created_at := old.created_at;
  end if;

  if new.trigger_date is not null and (new.trigger_date < date '2000-01-01' or new.trigger_date > current_date + 3650) then
    raise exception 'Start date looks wrong';
  end if;
  if new.custom_due_date is not null and (new.custom_due_date < date '2000-01-01' or new.custom_due_date > current_date + 3650) then
    raise exception 'Due date looks wrong';
  end if;

  new.due_date := public.ccma_compute_due_date(new.dispute_type, new.trigger_date, new.custom_due_date);
  if new.due_date is null then
    raise exception 'Could not work out the due date for %', new.dispute_type;
  end if;

  -- Reminder schedule: whole days 0..60, unique, largest first.
  new.reminder_days := coalesce(
    (select array_agg(d order by d desc)
       from (select distinct d from unnest(coalesce(new.reminder_days, '{}'::integer[])) d
              where d between 0 and 60) s),
    '{}'::integer[]);

  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;

  new.title := btrim(new.title);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ccma_matters_before_write on public.ccma_matters;
create trigger ccma_matters_before_write
  before insert or update on public.ccma_matters
  for each row execute function public.ccma_matters_before_write();

alter table public.ccma_matters enable row level security;

-- The account owner and active team members share the account's deadlines
-- (same model as generated_documents). Signed-in users only.
drop policy if exists "Account members read CCMA matters" on public.ccma_matters;
create policy "Account members read CCMA matters" on public.ccma_matters
  for select to authenticated
  using (public.is_account_member(owner_user_id, auth.uid()));

drop policy if exists "Account members add CCMA matters" on public.ccma_matters;
create policy "Account members add CCMA matters" on public.ccma_matters
  for insert to authenticated
  with check (created_by_user_id = auth.uid() and public.is_account_member(owner_user_id, auth.uid()));

drop policy if exists "Account members update CCMA matters" on public.ccma_matters;
create policy "Account members update CCMA matters" on public.ccma_matters
  for update to authenticated
  using (public.is_account_member(owner_user_id, auth.uid()))
  with check (public.is_account_member(owner_user_id, auth.uid()));

drop policy if exists "Account members delete CCMA matters" on public.ccma_matters;
create policy "Account members delete CCMA matters" on public.ccma_matters
  for delete to authenticated
  using (public.is_account_member(owner_user_id, auth.uid()));

-- 3) Reminders (in-app feed + email outbox) ---------------------------------------
-- stage = days-before-due offset from the schedule (0 = due day, -1 = overdue).
-- Unique per (matter, due date, stage): editing the date re-arms reminders.
create table if not exists public.ccma_deadline_reminders (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid not null references public.ccma_matters(id) on delete cascade,
  owner_user_id uuid not null,
  recipient_user_id uuid not null,
  due_date date not null,
  stage integer not null,
  days_left integer not null,
  email_status text not null default 'pending'
    check (email_status in ('pending', 'sent', 'skipped', 'failed')),
  email_attempts integer not null default 0,
  emailed_at timestamptz,
  email_error text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (matter_id, due_date, stage)
);
create index if not exists ccma_deadline_reminders_owner_created_idx
  on public.ccma_deadline_reminders (owner_user_id, created_at desc);
create index if not exists ccma_deadline_reminders_pending_idx
  on public.ccma_deadline_reminders (created_at) where email_status in ('pending', 'failed');

alter table public.ccma_deadline_reminders enable row level security;

drop policy if exists "Account members read CCMA reminders" on public.ccma_deadline_reminders;
create policy "Account members read CCMA reminders" on public.ccma_deadline_reminders
  for select to authenticated
  using (public.is_account_member(owner_user_id, auth.uid()));

drop policy if exists "Account members mark CCMA reminders read" on public.ccma_deadline_reminders;
create policy "Account members mark CCMA reminders read" on public.ccma_deadline_reminders
  for update to authenticated
  using (public.is_account_member(owner_user_id, auth.uid()))
  with check (public.is_account_member(owner_user_id, auth.uid()));

-- Signed-in users may only flip read_at; rows are created by the daily job.
revoke insert, update, delete on public.ccma_deadline_reminders from anon, authenticated;
grant select on public.ccma_deadline_reminders to authenticated;
grant update (read_at) on public.ccma_deadline_reminders to authenticated;

-- 4) Daily flagging ------------------------------------------------------------------
-- Mirrors reminderStage() in _shared/ccmaDeadlines.ts.
create or replace function public.ccma_reminder_stage(p_days_left integer, p_schedule integer[])
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when p_days_left < 0 then case when p_days_left >= -7 then -1 end
    else (select min(o) from unnest(array_append(coalesce(p_schedule, '{}'::integer[]), 0)) o
           where o >= p_days_left and o between 0 and 60)
  end;
$$;

create or replace function public.flag_ccma_deadline_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Africa/Johannesburg')::date;
  n integer;
begin
  with due as (
    select m.id, m.owner_user_id, m.created_by_user_id, m.due_date, m.email_reminders,
           (m.due_date - today) as days_left,
           public.ccma_reminder_stage(m.due_date - today, m.reminder_days) as stage
      from public.ccma_matters m
     where m.status = 'open'
       and m.due_date between today - 7 and today + 60
  ), ins as (
    insert into public.ccma_deadline_reminders
      (matter_id, owner_user_id, recipient_user_id, due_date, stage, days_left, email_status)
    select id, owner_user_id, created_by_user_id, due_date, stage, days_left,
           case when email_reminders then 'pending' else 'skipped' end
      from due
     where stage is not null
    on conflict (matter_id, due_date, stage) do nothing
    returning matter_id
  ), upd as (
    update public.ccma_matters m
       set reminder_sent_at = now()
     where m.id in (select matter_id from ins)
    returning 1
  )
  select count(*) into n from upd;
  return n;
end;
$$;

revoke all on function public.flag_ccma_deadline_reminders() from public, anon, authenticated;
grant execute on function public.flag_ccma_deadline_reminders() to service_role;

-- 06:30 SAST (04:30 UTC): create in-app reminders even if email is unavailable.
-- 07:00 SAST (05:00 UTC): edge function re-runs the flagging (idempotent) and sends emails.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'ccma-deadline-flag-daily') then
    perform cron.unschedule('ccma-deadline-flag-daily');
  end if;
  perform cron.schedule('ccma-deadline-flag-daily', '30 4 * * *', 'select public.flag_ccma_deadline_reminders();');

  if exists (select 1 from cron.job where jobname = 'ccma-deadline-email-daily') then
    perform cron.unschedule('ccma-deadline-email-daily');
  end if;
  perform cron.schedule('ccma-deadline-email-daily', '0 5 * * *', $cmd$
    select net.http_post(
      url := 'https://riqswihuzclbyjemynyd.supabase.co/functions/v1/ccma-deadline-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET' limit 1), '')
      ),
      body := '{}'::jsonb
    );
  $cmd$);
end;
$$;

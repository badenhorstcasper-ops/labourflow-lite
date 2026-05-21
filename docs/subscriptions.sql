-- Run this SQL once in the Supabase SQL editor (project ckjevliuwlijfvdjxmmp)
-- to create the subscriptions table used by the PayFast webhook.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_name text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);

alter table public.subscriptions enable row level security;

create policy "Users can view their own subscription"
  on public.subscriptions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Inserts/updates are only performed by the payfast-webhook edge function
-- using the service-role key, so no client-side write policy is required.

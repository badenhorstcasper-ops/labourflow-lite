
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
  on public.subscriptions for select to authenticated
  using (auth.uid() = user_id);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null,
  member_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (owner_user_id, member_email)
);
create index if not exists team_members_owner_idx on public.team_members(owner_user_id);
create index if not exists team_members_member_user_idx on public.team_members(member_user_id);
create index if not exists team_members_email_idx on public.team_members(lower(member_email));
alter table public.team_members enable row level security;

create policy "Owner can read own team" on public.team_members for select to authenticated
  using (auth.uid() = owner_user_id);
create policy "Owner can insert own team" on public.team_members for insert to authenticated
  with check (auth.uid() = owner_user_id);
create policy "Owner can update own team" on public.team_members for update to authenticated
  using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
create policy "Owner can delete own team" on public.team_members for delete to authenticated
  using (auth.uid() = owner_user_id);
create policy "Member can read own membership" on public.team_members for select to authenticated
  using (auth.uid() = member_user_id);

create or replace function public.link_team_member_on_signup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.team_members
     set member_user_id = new.id, status = 'active', joined_at = now()
   where lower(member_email) = lower(new.email) and status = 'pending';
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_link_team on auth.users;
create trigger on_auth_user_created_link_team
  after insert on auth.users for each row execute function public.link_team_member_on_signup();

create or replace function public.current_account_owner()
returns uuid language sql stable security definer set search_path = public as $$
  select coalesce(
    (select owner_user_id from public.team_members
       where member_user_id = auth.uid() and status = 'active'
       order by joined_at desc nulls last limit 1),
    auth.uid()
  );
$$;
grant execute on function public.current_account_owner() to authenticated;

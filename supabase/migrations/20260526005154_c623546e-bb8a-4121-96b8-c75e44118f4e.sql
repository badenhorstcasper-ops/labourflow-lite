-- Allow pending subscriptions to exist before the user has signed up.
alter table public.subscriptions alter column user_id drop not null;
alter table public.subscriptions add column if not exists email text;
create index if not exists subscriptions_email_idx on public.subscriptions (lower(email));

-- When a user signs up, attach any pending subscription rows that match their email.
create or replace function public.link_subscription_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
     set user_id = new.id,
         updated_at = now()
   where user_id is null
     and email is not null
     and lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_link_subscription on auth.users;
create trigger on_auth_user_created_link_subscription
  after insert on auth.users
  for each row execute function public.link_subscription_on_signup();
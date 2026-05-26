-- company_profiles
create table public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique,
  company_name text not null default '',
  trading_name text,
  registration_number text,
  vat_number text,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text,
  contact_email text,
  contact_phone text,
  website text,
  logo_url text,
  accent_color text not null default '#2563eb',
  signatory_name text,
  signatory_title text,
  doc_counter int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_profiles enable row level security;

create policy "Owner reads own profile" on public.company_profiles
  for select to authenticated using (auth.uid() = owner_user_id);

create policy "Owner upserts own profile" on public.company_profiles
  for insert to authenticated with check (auth.uid() = owner_user_id);

create policy "Owner updates own profile" on public.company_profiles
  for update to authenticated using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy "Team member reads owner profile" on public.company_profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.owner_user_id = company_profiles.owner_user_id
        and tm.member_user_id = auth.uid()
        and tm.status = 'active'
    )
  );

-- generated_documents
create table public.generated_documents (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  created_by_user_id uuid not null,
  doc_type text not null,
  title text not null,
  doc_number text not null,
  pdf_path text,
  docx_path text,
  share_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  share_expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.generated_documents (owner_user_id, created_at desc);
create index on public.generated_documents (share_token);

alter table public.generated_documents enable row level security;

create policy "Owner reads own docs" on public.generated_documents
  for select to authenticated using (auth.uid() = owner_user_id);

create policy "Team member reads owner docs" on public.generated_documents
  for select to authenticated
  using (
    exists (
      select 1 from public.team_members tm
      where tm.owner_user_id = generated_documents.owner_user_id
        and tm.member_user_id = auth.uid()
        and tm.status = 'active'
    )
  );

create policy "Owner or team inserts docs" on public.generated_documents
  for insert to authenticated
  with check (
    auth.uid() = created_by_user_id and (
      auth.uid() = owner_user_id or
      exists (
        select 1 from public.team_members tm
        where tm.owner_user_id = generated_documents.owner_user_id
          and tm.member_user_id = auth.uid()
          and tm.status = 'active'
      )
    )
  );

create policy "Owner updates own docs" on public.generated_documents
  for update to authenticated using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create policy "Owner deletes own docs" on public.generated_documents
  for delete to authenticated using (auth.uid() = owner_user_id);

-- updated_at trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create trigger company_profiles_touch
  before update on public.company_profiles
  for each row execute function public.touch_updated_at();

-- per-owner doc number
create or replace function public.next_document_number(_owner uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  -- only owner or active team member may increment
  if not (auth.uid() = _owner or exists (
    select 1 from public.team_members tm
    where tm.owner_user_id = _owner and tm.member_user_id = auth.uid() and tm.status = 'active'
  )) then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  insert into public.company_profiles (owner_user_id, doc_counter)
    values (_owner, 1)
    on conflict (owner_user_id) do update set doc_counter = company_profiles.doc_counter + 1
    returning doc_counter into n;
  return 'DOC-' || lpad(n::text, 5, '0');
end $$;

-- storage buckets
insert into storage.buckets (id, name, public) values ('company-logos', 'company-logos', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
  on conflict (id) do nothing;

-- company-logos: public read, owner writes their own folder {owner_user_id}/...
create policy "Logos are public" on storage.objects
  for select using (bucket_id = 'company-logos');

create policy "Owner uploads own logo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Owner updates own logo" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Owner deletes own logo" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- documents: private. Owner reads/writes own folder; team members read their owner's folder.
create policy "Owner reads own documents" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Team member reads owner documents" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.team_members tm
      where tm.owner_user_id::text = (storage.foldername(name))[1]
        and tm.member_user_id = auth.uid()
        and tm.status = 'active'
    )
  );

create policy "Owner or team uploads documents" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (
      auth.uid()::text = (storage.foldername(name))[1]
      or exists (
        select 1 from public.team_members tm
        where tm.owner_user_id::text = (storage.foldername(name))[1]
          and tm.member_user_id = auth.uid()
          and tm.status = 'active'
      )
    )
  );

create policy "Owner deletes own documents" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
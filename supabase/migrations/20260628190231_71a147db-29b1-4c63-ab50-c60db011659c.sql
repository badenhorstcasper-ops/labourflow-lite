
-- 1) Lock down company-logos: remove world-readable policy, add owner-only + team-member read.
drop policy if exists "Logos are public" on storage.objects;

create policy "Owner reads own logo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'company-logos'
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

-- 2) Revoke column-level SELECT on team_members.invite_token from regular users.
--    Owner-side code that needs the token uses service_role via edge functions; the
--    accept-invite RPC is SECURITY DEFINER and bypasses column grants.
revoke select (invite_token) on public.team_members from authenticated;
revoke select (invite_token) on public.team_members from anon;
-- service_role keeps full access (granted globally).

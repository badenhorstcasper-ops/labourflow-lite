-- company_profiles: allow active team members to create/update the account profile
DROP POLICY IF EXISTS "Owner upserts own profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Owner updates own profile" ON public.company_profiles;

CREATE POLICY "Account member inserts profile"
  ON public.company_profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_account_member(owner_user_id, auth.uid()));

CREATE POLICY "Account member updates profile"
  ON public.company_profiles FOR UPDATE TO authenticated
  USING (public.is_account_member(owner_user_id, auth.uid()))
  WITH CHECK (public.is_account_member(owner_user_id, auth.uid()));

-- company-logos bucket: same account-member rule for write/read/delete
DROP POLICY IF EXISTS "Owner uploads own logo" ON storage.objects;
DROP POLICY IF EXISTS "Owner updates own logo" ON storage.objects;
DROP POLICY IF EXISTS "Owner deletes own logo" ON storage.objects;
DROP POLICY IF EXISTS "Owner lists own logos" ON storage.objects;
DROP POLICY IF EXISTS "Owner reads own logo" ON storage.objects;

CREATE POLICY "logos_insert_account_member"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos'
    AND public.is_account_member(NULLIF(split_part(name, '/', 1), '')::uuid, auth.uid()));

CREATE POLICY "logos_update_account_member"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos'
    AND public.is_account_member(NULLIF(split_part(name, '/', 1), '')::uuid, auth.uid()))
  WITH CHECK (bucket_id = 'company-logos'
    AND public.is_account_member(NULLIF(split_part(name, '/', 1), '')::uuid, auth.uid()));

CREATE POLICY "logos_delete_account_member"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos'
    AND public.is_account_member(NULLIF(split_part(name, '/', 1), '')::uuid, auth.uid()));

CREATE POLICY "logos_select_account_member"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos'
    AND public.is_account_member(NULLIF(split_part(name, '/', 1), '')::uuid, auth.uid()));

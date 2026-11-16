CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN coalesce(auth.role(), '') IN ('anon', 'authenticated')
         AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  END
$$;

CREATE OR REPLACE FUNCTION public.is_account_member(_owner uuid, _user uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN coalesce(auth.role(), '') IN ('anon', 'authenticated')
         AND auth.uid() IS DISTINCT FROM _user AND auth.uid() IS DISTINCT FROM _owner THEN false
    ELSE _owner = _user OR EXISTS (
      SELECT 1 FROM public.team_members
      WHERE owner_user_id = _owner AND member_user_id = _user AND status = 'active')
  END
$$;

REVOKE EXECUTE ON FUNCTION public.is_account_member(uuid, uuid) FROM anon;
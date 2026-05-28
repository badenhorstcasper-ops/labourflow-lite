-- 1. Subscriptions: only allow self-cancel (status='cancelled')
DROP POLICY IF EXISTS "Users can cancel their own subscription" ON public.subscriptions;
CREATE POLICY "Users can cancel their own subscription"
ON public.subscriptions
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

-- 2. Team invite token: clear after acceptance, both via direct signup link and via accept_team_invite
CREATE OR REPLACE FUNCTION public.link_team_member_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
begin
  update public.team_members
     set member_user_id = new.id,
         status = 'active',
         joined_at = now(),
         invite_token = encode(extensions.gen_random_bytes(16), 'hex')  -- rotate so old token is unusable
   where lower(member_email) = lower(new.email) and status = 'pending';
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  uid uuid := auth.uid();
  email_val text;
  inv public.team_members;
  owner_plan text;
  seat_cap int;
  seats_used int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT email INTO email_val FROM auth.users WHERE id = uid;

  SELECT * INTO inv FROM public.team_members WHERE invite_token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF inv.status = 'active' AND inv.member_user_id IS NOT NULL AND inv.member_user_id <> uid THEN
    RAISE EXCEPTION 'invite_already_used' USING ERRCODE = 'P0001';
  END IF;

  SELECT plan_name INTO owner_plan
    FROM public.subscriptions
   WHERE user_id = inv.owner_user_id
   ORDER BY updated_at DESC NULLS LAST
   LIMIT 1;

  seat_cap := CASE COALESCE(owner_plan, 'Solo')
    WHEN 'Solo' THEN 1
    WHEN 'Business' THEN 5
    WHEN 'Professional' THEN 10
    WHEN 'Enterprise' THEN 15
    ELSE 1
  END;

  SELECT count(*) INTO seats_used
    FROM public.team_members
   WHERE owner_user_id = inv.owner_user_id
     AND status = 'active';

  IF inv.status <> 'active' AND (seats_used + 1) >= seat_cap THEN
    RAISE EXCEPTION 'seat_limit_reached' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.team_members
     SET member_user_id = uid,
         member_email = COALESCE(email_val, member_email),
         status = 'active',
         joined_at = COALESCE(joined_at, now()),
         accepted_at = now(),
         invite_token = encode(extensions.gen_random_bytes(16), 'hex')  -- rotate token, old one unusable
   WHERE id = inv.id;

  RETURN jsonb_build_object(
    'owner_user_id', inv.owner_user_id,
    'plan_name', COALESCE(owner_plan, 'Solo')
  );
END;
$function$;

-- 3. Documents storage bucket: add team-member UPDATE policy to match INSERT
CREATE POLICY "Team member updates owner documents"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents' AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.owner_user_id::text = (storage.foldername(objects.name))[1]
      AND tm.member_user_id = auth.uid()
      AND tm.status = 'active'
  )
)
WITH CHECK (
  bucket_id = 'documents' AND EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.owner_user_id::text = (storage.foldername(objects.name))[1]
      AND tm.member_user_id = auth.uid()
      AND tm.status = 'active'
  )
);

-- 4. company-logos: replace bucket-wide SELECT with owner-scoped listing.
-- Public CDN reads still work (public bucket bypasses RLS for direct file fetches);
-- only the LIST API is restricted so users can't enumerate other users' logos.
DROP POLICY IF EXISTS "Logos are public" ON storage.objects;
CREATE POLICY "Owner lists own logos"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'company-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Revoke EXECUTE from anon on helper functions that require an authenticated session
REVOKE EXECUTE ON FUNCTION public.accept_team_invite(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.next_document_number(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.register_device(text, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_account_owner() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_team_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_document_number(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_device(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_account_owner() TO authenticated;
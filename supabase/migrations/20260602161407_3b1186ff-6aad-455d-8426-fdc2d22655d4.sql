-- 1. Refresh register_device so PostgREST picks it up (clears schema-cache miss seen in console)
CREATE OR REPLACE FUNCTION public.register_device(_device_id text, _label text DEFAULT NULL, _ua text DEFAULT NULL)
RETURNS public.user_devices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing public.user_devices;
  device_count int;
  result public.user_devices;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='P0001'; END IF;
  IF _device_id IS NULL OR length(_device_id) < 8 THEN RAISE EXCEPTION 'invalid_device_id' USING ERRCODE='P0001'; END IF;
  SELECT * INTO existing FROM public.user_devices WHERE user_id=uid AND device_id=_device_id;
  IF FOUND THEN
    UPDATE public.user_devices SET last_seen_at=now(), user_agent=COALESCE(_ua,user_agent), label=COALESCE(_label,label)
      WHERE id=existing.id RETURNING * INTO result;
    RETURN result;
  END IF;
  SELECT count(*) INTO device_count FROM public.user_devices WHERE user_id=uid;
  IF device_count >= 2 THEN RAISE EXCEPTION 'device_limit_reached' USING ERRCODE='P0001'; END IF;
  INSERT INTO public.user_devices (user_id, device_id, label, user_agent)
  VALUES (uid, _device_id, _label, _ua) RETURNING * INTO result;
  RETURN result;
END $$;

-- 2. Create the missing on_auth_user_created triggers so signup links pending invites and prepaid subscriptions
DROP TRIGGER IF EXISTS on_auth_user_created_link_team ON auth.users;
CREATE TRIGGER on_auth_user_created_link_team
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_team_member_on_signup();

DROP TRIGGER IF EXISTS on_auth_user_created_link_sub ON auth.users;
CREATE TRIGGER on_auth_user_created_link_sub
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_subscription_on_signup();

-- 3. Tighten SECURITY DEFINER function grants (linter WARN 1 & 2)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_team_member_on_signup() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_subscription_on_signup() FROM anon, authenticated, PUBLIC;

-- 4. Defensive: ensure no client role can directly INSERT/UPDATE plan rows (only PayFast webhook via service_role)
REVOKE INSERT, DELETE ON public.subscriptions FROM anon, authenticated, PUBLIC;
-- Keep UPDATE for authenticated so the "Users can cancel their own subscription" policy continues to work.
GRANT SELECT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
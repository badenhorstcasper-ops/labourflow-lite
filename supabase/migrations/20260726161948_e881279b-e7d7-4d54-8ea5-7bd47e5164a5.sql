CREATE OR REPLACE FUNCTION public.register_device(_device_id text, _label text DEFAULT NULL::text, _ua text DEFAULT NULL::text)
 RETURNS user_devices
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  existing public.user_devices;
  device_count int;
  limit_for_user int := 2;
  result public.user_devices;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='P0001'; END IF;
  IF _device_id IS NULL OR length(_device_id) < 8 THEN RAISE EXCEPTION 'invalid_device_id' USING ERRCODE='P0001'; END IF;

  SELECT GREATEST(COALESCE(MIN(device_limit), 2), 2) INTO limit_for_user
    FROM public.subscriptions WHERE user_id = uid;

  IF public.has_role(uid, 'admin') THEN
    limit_for_user := 1000000;
  END IF;

  SELECT * INTO existing FROM public.user_devices WHERE user_id=uid AND device_id=_device_id;
  IF FOUND THEN
    UPDATE public.user_devices SET last_seen_at=now(), user_agent=COALESCE(_ua,user_agent), label=COALESCE(_label,label)
      WHERE id=existing.id RETURNING * INTO result;
    RETURN result;
  END IF;
  SELECT count(*) INTO device_count FROM public.user_devices WHERE user_id=uid;
  IF device_count >= limit_for_user THEN
    RAISE EXCEPTION 'device_limit_reached' USING ERRCODE='P0001';
  END IF;
  INSERT INTO public.user_devices (user_id, device_id, label, user_agent)
  VALUES (uid, _device_id, _label, _ua) RETURNING * INTO result;
  RETURN result;
END $function$;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS device_limit int NOT NULL DEFAULT 2;

ALTER TYPE salesperson_status ADD VALUE IF NOT EXISTS 'notice';
ALTER TABLE public.salespersons
  ADD COLUMN IF NOT EXISTS notice_end_date date,
  ADD COLUMN IF NOT EXISTS terminated_reason text;

CREATE TABLE IF NOT EXISTS public.partner_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id uuid REFERENCES public.salespersons(id) ON DELETE CASCADE,
  applicant_email text NOT NULL,
  agreement_version text NOT NULL,
  accepted_full_name text NOT NULL,
  clause_flags jsonb NOT NULL,
  accepted_ip text,
  accepted_user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_agreements TO authenticated;
GRANT ALL ON public.partner_agreements TO service_role;

ALTER TABLE public.partner_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partner reads own agreement"
  ON public.partner_agreements FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.salespersons s
            WHERE s.id = partner_agreements.salesperson_id AND s.user_id = auth.uid())
  );

CREATE POLICY "admin reads all agreements"
  ON public.partner_agreements FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "no client writes to agreements"
  ON public.partner_agreements AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (false) WITH CHECK (false);

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

  SELECT COALESCE(MIN(device_limit), 2) INTO limit_for_user
    FROM public.subscriptions WHERE user_id = uid;

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

-- 1. Invite codes -----------------------------------------------------------
CREATE TABLE public.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own code" ON public.referral_codes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read codes" ON public.referral_codes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 2. Referred signups --------------------------------------------------------
CREATE TABLE public.referral_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_email text,
  code text NOT NULL,
  device_id text,
  status text NOT NULL DEFAULT 'pending',
  blocked_reason text,
  converted_plan text,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX referral_signups_referrer_idx ON public.referral_signups(referrer_user_id);
CREATE INDEX referral_signups_email_idx ON public.referral_signups(lower(referred_email));
GRANT SELECT ON public.referral_signups TO authenticated;
GRANT ALL ON public.referral_signups TO service_role;
ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own referrals" ON public.referral_signups FOR SELECT TO authenticated USING (referrer_user_id = auth.uid());
CREATE POLICY "admins read referrals" ON public.referral_signups FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER referral_signups_touch BEFORE UPDATE ON public.referral_signups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Referral credit ---------------------------------------------------------
CREATE TABLE public.referral_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signup_id uuid REFERENCES public.referral_signups(id) ON DELETE SET NULL,
  amount_zar numeric(10,2) NOT NULL,
  plan_name text,
  status text NOT NULL DEFAULT 'granted',
  note text,
  applied_at timestamptz,
  reversed_at timestamptz,
  reversed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX referral_credits_user_idx ON public.referral_credits(user_id);
GRANT SELECT ON public.referral_credits TO authenticated;
GRANT ALL ON public.referral_credits TO service_role;
ALTER TABLE public.referral_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own credit" ON public.referral_credits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins read credit" ON public.referral_credits FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER referral_credits_touch BEFORE UPDATE ON public.referral_credits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. Settings ----------------------------------------------------------------
CREATE TABLE public.referral_settings (
  id integer PRIMARY KEY DEFAULT 1,
  monthly_cap_zar numeric(10,2) NOT NULL DEFAULT 500,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_settings_single_row CHECK (id = 1)
);
INSERT INTO public.referral_settings (id) VALUES (1);
GRANT SELECT ON public.referral_settings TO authenticated;
GRANT ALL ON public.referral_settings TO service_role;
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone signed in can read cap" ON public.referral_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins update cap" ON public.referral_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- 5. Get or create the signed-in person's invite code ------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing text;
  candidate text;
  tries int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  SELECT code INTO existing FROM public.referral_codes WHERE user_id = uid;
  IF existing IS NOT NULL THEN RETURN existing; END IF;

  LOOP
    candidate := 'RE-' || upper(substring(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = candidate);
    tries := tries + 1;
    IF tries > 20 THEN RAISE EXCEPTION 'could_not_generate_code'; END IF;
  END LOOP;

  INSERT INTO public.referral_codes (user_id, code) VALUES (uid, candidate)
    ON CONFLICT (user_id) DO UPDATE SET code = public.referral_codes.code
    RETURNING code INTO existing;
  RETURN existing;
END;
$$;

-- 6. Summary for the signed-in person ----------------------------------------
CREATE OR REPLACE FUNCTION public.referral_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'signups', (SELECT count(*) FROM public.referral_signups s
                 WHERE s.referrer_user_id = auth.uid() AND s.status <> 'blocked'),
    'conversions', (SELECT count(*) FROM public.referral_signups s
                 WHERE s.referrer_user_id = auth.uid() AND s.status = 'converted'),
    'credit_available', (SELECT coalesce(sum(c.amount_zar),0) FROM public.referral_credits c
                 WHERE c.user_id = auth.uid() AND c.status = 'granted'),
    'credit_earned_total', (SELECT coalesce(sum(c.amount_zar),0) FROM public.referral_credits c
                 WHERE c.user_id = auth.uid() AND c.status <> 'reversed'),
    'credit_this_month', (SELECT coalesce(sum(c.amount_zar),0) FROM public.referral_credits c
                 WHERE c.user_id = auth.uid() AND c.status <> 'reversed'
                   AND c.created_at >= date_trunc('month', now())),
    'monthly_cap', (SELECT monthly_cap_zar FROM public.referral_settings WHERE id = 1)
  );
$$;
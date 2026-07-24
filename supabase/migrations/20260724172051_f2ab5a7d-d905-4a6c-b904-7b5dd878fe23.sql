
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.salesperson_status AS ENUM ('pending_approval','active','inactive','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.commission_status AS ENUM ('pending','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ salespersons ============
CREATE TABLE public.salespersons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_code text UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  id_number text,
  banking_details jsonb,
  status public.salesperson_status NOT NULL DEFAULT 'pending_approval',
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX salespersons_email_lower_idx ON public.salespersons (lower(email));

GRANT SELECT, UPDATE ON public.salespersons TO authenticated;
GRANT ALL ON public.salespersons TO service_role;
ALTER TABLE public.salespersons ENABLE ROW LEVEL SECURITY;

-- Column privileges: block id_number & banking_details from ordinary authenticated reads
REVOKE ALL ON public.salespersons FROM authenticated;
GRANT SELECT (id, user_id, referral_code, full_name, email, phone, status, approved_at, notes, created_at, updated_at)
  ON public.salespersons TO authenticated;
GRANT UPDATE (phone) ON public.salespersons TO authenticated;

-- Salespeople see own row; admins see all
CREATE POLICY "sp_self_select" ON public.salespersons
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "sp_admin_all" ON public.salespersons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "sp_self_update_phone" ON public.salespersons
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_salespersons_updated_at
  BEFORE UPDATE ON public.salespersons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Referral code generator
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  candidate text;
  attempts int := 0;
BEGIN
  LOOP
    candidate := 'INR-' || upper(substring(md5(gen_random_uuid()::text || clock_timestamp()::text), 1, 4));
    IF NOT EXISTS (SELECT 1 FROM public.salespersons WHERE referral_code = candidate) THEN
      RETURN candidate;
    END IF;
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'could not generate unique referral code';
    END IF;
  END LOOP;
END $$;

-- Auto-link salesperson auth account on signup by matching email
CREATE OR REPLACE FUNCTION public.link_salesperson_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.salespersons
     SET user_id = NEW.id, updated_at = now()
   WHERE lower(email) = lower(NEW.email) AND user_id IS NULL;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_salesperson ON auth.users;
CREATE TRIGGER on_auth_user_created_link_salesperson
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.link_salesperson_on_signup();

-- ============ salesperson_access_log ============
CREATE TABLE public.salesperson_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id uuid NOT NULL REFERENCES public.salespersons(id) ON DELETE CASCADE,
  viewer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewer_email text,
  field_viewed text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.salesperson_access_log TO authenticated;
GRANT ALL ON public.salesperson_access_log TO service_role;
ALTER TABLE public.salesperson_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sp_log_admin_read" ON public.salesperson_access_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "sp_log_admin_insert" ON public.salesperson_access_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Admin-only fetch of sensitive fields; every call is logged
CREATE OR REPLACE FUNCTION public.get_salesperson_sensitive(_salesperson_id uuid)
RETURNS TABLE(id_number text, banking_details jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.salesperson_access_log(salesperson_id, viewer_user_id, viewer_email, field_viewed)
  VALUES (_salesperson_id, auth.uid(), (SELECT email FROM auth.users WHERE id = auth.uid()), 'id_number+banking_details');
  RETURN QUERY
    SELECT s.id_number, s.banking_details FROM public.salespersons s WHERE s.id = _salesperson_id;
END $$;

-- ============ commission_rates ============
CREATE TABLE public.commission_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name text NOT NULL,
  amount_zar numeric(10,2) NOT NULL,
  active_from date NOT NULL DEFAULT current_date,
  active_to date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX commission_rates_plan_idx ON public.commission_rates(plan_name, active_from);
GRANT SELECT ON public.commission_rates TO authenticated, anon;
GRANT ALL ON public.commission_rates TO service_role;
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rates_public_read" ON public.commission_rates FOR SELECT USING (true);
CREATE POLICY "rates_admin_write" ON public.commission_rates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.commission_rates(plan_name, amount_zar) VALUES
  ('Solo', 50),('Business', 90),('Professional', 250),('Enterprise', 900);

-- ============ referrals ============
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_user_id uuid,
  subscriber_email text,
  salesperson_id uuid NOT NULL REFERENCES public.salespersons(id) ON DELETE RESTRICT,
  referral_code text NOT NULL,
  attributed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX referrals_user_uniq ON public.referrals(subscriber_user_id) WHERE subscriber_user_id IS NOT NULL;
CREATE UNIQUE INDEX referrals_email_uniq ON public.referrals(lower(subscriber_email)) WHERE subscriber_email IS NOT NULL AND subscriber_user_id IS NULL;
CREATE INDEX referrals_sp_idx ON public.referrals(salesperson_id);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ref_self_or_admin_read" ON public.referrals
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR salesperson_id IN (SELECT id FROM public.salespersons WHERE user_id = auth.uid())
  );
CREATE POLICY "ref_admin_write" ON public.referrals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ commission_calculations ============
CREATE TABLE public.commission_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id uuid NOT NULL REFERENCES public.salespersons(id) ON DELETE CASCADE,
  calendar_month date NOT NULL,
  active_subs_count int NOT NULL DEFAULT 0,
  cancellations_count int NOT NULL DEFAULT 0,
  gross_commission_zar numeric(10,2) NOT NULL DEFAULT 0,
  status public.commission_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  paid_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(salesperson_id, calendar_month)
);
GRANT SELECT ON public.commission_calculations TO authenticated;
GRANT ALL ON public.commission_calculations TO service_role;
ALTER TABLE public.commission_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calc_self_or_admin_read" ON public.commission_calculations
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR salesperson_id IN (SELECT id FROM public.salespersons WHERE user_id = auth.uid())
  );
CREATE POLICY "calc_admin_write" ON public.commission_calculations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_calc_updated_at
  BEFORE UPDATE ON public.commission_calculations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ commission_line_items ============
CREATE TABLE public.commission_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id uuid NOT NULL REFERENCES public.commission_calculations(id) ON DELETE CASCADE,
  salesperson_id uuid NOT NULL REFERENCES public.salespersons(id) ON DELETE CASCADE,
  subscriber_user_id uuid,
  subscriber_email text,
  plan_name text NOT NULL,
  amount_zar numeric(10,2) NOT NULL,
  transaction_ref text,
  collected_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cli_calc_idx ON public.commission_line_items(calculation_id);
CREATE UNIQUE INDEX cli_calc_tx_idx ON public.commission_line_items(calculation_id, transaction_ref) WHERE transaction_ref IS NOT NULL;
GRANT SELECT ON public.commission_line_items TO authenticated;
GRANT ALL ON public.commission_line_items TO service_role;
ALTER TABLE public.commission_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cli_self_or_admin" ON public.commission_line_items
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin')
    OR salesperson_id IN (SELECT id FROM public.salespersons WHERE user_id = auth.uid())
  );
CREATE POLICY "cli_admin_write" ON public.commission_line_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ public_holidays ============
CREATE TABLE public.public_holidays (
  date date PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.public_holidays TO authenticated, anon;
GRANT ALL ON public.public_holidays TO service_role;
ALTER TABLE public.public_holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hol_public_read" ON public.public_holidays FOR SELECT USING (true);
CREATE POLICY "hol_admin_write" ON public.public_holidays
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.public_holidays(date, name) VALUES
  ('2026-01-01','New Year''s Day'),
  ('2026-03-21','Human Rights Day'),
  ('2026-03-23','Human Rights Day (observed)'),
  ('2026-04-03','Good Friday'),
  ('2026-04-06','Family Day'),
  ('2026-04-27','Freedom Day'),
  ('2026-05-01','Workers'' Day'),
  ('2026-06-16','Youth Day'),
  ('2026-08-09','National Women''s Day'),
  ('2026-08-10','National Women''s Day (observed)'),
  ('2026-09-24','Heritage Day'),
  ('2026-12-16','Day of Reconciliation'),
  ('2026-12-25','Christmas Day'),
  ('2026-12-26','Day of Goodwill'),
  ('2027-01-01','New Year''s Day'),
  ('2027-03-22','Human Rights Day (observed)'),
  ('2027-03-26','Good Friday'),
  ('2027-03-29','Family Day'),
  ('2027-04-27','Freedom Day'),
  ('2027-05-01','Workers'' Day'),
  ('2027-06-16','Youth Day'),
  ('2027-08-09','National Women''s Day'),
  ('2027-09-24','Heritage Day'),
  ('2027-12-16','Day of Reconciliation'),
  ('2027-12-27','Christmas Day (observed)'),
  ('2027-12-28','Day of Goodwill (observed)')
ON CONFLICT DO NOTHING;

-- ============ notification_log ============
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  type text NOT NULL,
  related_month date,
  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_admin_read" ON public.notification_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ Business day payout helper ============
CREATE OR REPLACE FUNCTION public.commission_payout_date(_month date)
RETURNS date LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  d date := (date_trunc('month', _month) + interval '1 month - 1 day')::date;
  added int := 0;
BEGIN
  WHILE added < 3 LOOP
    d := d + 1;
    IF extract(isodow FROM d) < 6
       AND NOT EXISTS (SELECT 1 FROM public.public_holidays h WHERE h.date = d) THEN
      added := added + 1;
    END IF;
  END LOOP;
  RETURN d;
END $$;

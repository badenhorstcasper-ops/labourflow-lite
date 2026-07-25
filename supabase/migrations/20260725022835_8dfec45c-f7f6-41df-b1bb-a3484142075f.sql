DROP POLICY IF EXISTS rates_public_read ON public.commission_rates;
CREATE POLICY rates_admin_read ON public.commission_rates FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.commission_rates FROM anon;
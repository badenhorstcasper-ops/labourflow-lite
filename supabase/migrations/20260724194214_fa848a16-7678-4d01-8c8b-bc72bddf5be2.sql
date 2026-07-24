DROP POLICY IF EXISTS "Users read their own webhook log" ON public.payfast_webhook_log;

DROP POLICY IF EXISTS "Admins can read webhook log" ON public.payfast_webhook_log;
CREATE POLICY "Admins can read webhook log"
ON public.payfast_webhook_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON public.payfast_webhook_log TO authenticated;
GRANT ALL ON public.payfast_webhook_log TO service_role;
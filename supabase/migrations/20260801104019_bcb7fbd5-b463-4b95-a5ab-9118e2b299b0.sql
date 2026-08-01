REVOKE EXECUTE ON FUNCTION public.get_or_create_referral_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.referral_summary() FROM anon;

CREATE POLICY "admins reverse credit" ON public.referral_credits FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admins update referrals" ON public.referral_signups FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
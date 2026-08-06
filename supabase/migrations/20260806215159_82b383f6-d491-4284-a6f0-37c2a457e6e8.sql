REVOKE SELECT ON public.salespersons FROM authenticated;

GRANT SELECT (
  id, user_id, referral_code, full_name, email, phone, status,
  approved_at, approved_by, notes, notice_end_date, terminated_reason,
  demo_revoked_at, created_at, updated_at
) ON public.salespersons TO authenticated;

GRANT ALL ON public.salespersons TO service_role;
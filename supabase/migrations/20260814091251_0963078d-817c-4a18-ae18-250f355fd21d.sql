REVOKE UPDATE ON public.salespersons FROM authenticated;
GRANT UPDATE (phone) ON public.salespersons TO authenticated;
REVOKE SELECT (id_number, banking_details) ON public.salespersons FROM authenticated, anon;
GRANT ALL ON public.salespersons TO service_role;
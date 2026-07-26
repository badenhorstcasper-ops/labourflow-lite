GRANT SELECT, INSERT, UPDATE, DELETE ON public.salespersons TO authenticated;
GRANT ALL ON public.salespersons TO service_role;
REVOKE ALL ON public.salespersons FROM anon;
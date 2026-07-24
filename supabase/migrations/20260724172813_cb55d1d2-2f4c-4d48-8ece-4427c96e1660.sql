
-- Remove any table-level write privileges from client-facing roles.
REVOKE INSERT, UPDATE, DELETE ON public.payfast_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

-- Add explicit deny policies so intent is unambiguous even if grants change later.
DROP POLICY IF EXISTS "Deny client writes on payfast_transactions" ON public.payfast_transactions;
CREATE POLICY "Deny client writes on payfast_transactions"
  ON public.payfast_transactions
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client writes on user_roles" ON public.user_roles;
CREATE POLICY "Deny client writes on user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client updates on user_roles" ON public.user_roles;
CREATE POLICY "Deny client updates on user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny client deletes on user_roles" ON public.user_roles;
CREATE POLICY "Deny client deletes on user_roles"
  ON public.user_roles
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

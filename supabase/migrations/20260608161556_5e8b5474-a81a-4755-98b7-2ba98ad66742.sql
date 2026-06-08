
CREATE OR REPLACE FUNCTION public._sec_scan_collect()
RETURNS TABLE(kind text, obj text, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- 1. public tables without RLS enabled
  RETURN QUERY
  SELECT 'rls_disabled'::text, c.relname::text, ''::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

  -- 2. public tables with RLS but no policies
  RETURN QUERY
  SELECT 'no_policies'::text, c.relname::text, ''::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
    AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid);

  -- 3. permissive policies (USING/WITH CHECK literally true) — exclude policies that intentionally allow public reads on a few known tables
  RETURN QUERY
  SELECT 'permissive_policy'::text,
         (c.relname || ':' || p.polname)::text,
         (coalesce(pg_get_expr(p.polqual,  p.polrelid), '') || ' | ' ||
          coalesce(pg_get_expr(p.polwithcheck, p.polrelid), ''))::text
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND (
      pg_get_expr(p.polqual, p.polrelid) = 'true'
      OR pg_get_expr(p.polwithcheck, p.polrelid) = 'true'
    );

  -- 4. anon role has table-level privileges
  RETURN QUERY
  SELECT 'anon_grant'::text, table_name::text, string_agg(privilege_type, ',')::text
  FROM information_schema.role_table_grants
  WHERE grantee = 'anon' AND table_schema = 'public'
  GROUP BY table_name;

  -- 5. tables with no GRANTs at all to authenticated or anon
  RETURN QUERY
  SELECT 'missing_grant'::text, c.relname::text, ''::text
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.role_table_grants g
      WHERE g.table_schema = 'public' AND g.table_name = c.relname
        AND g.grantee IN ('authenticated', 'anon')
    );

  -- 6. SECURITY DEFINER functions without a pinned search_path
  RETURN QUERY
  SELECT 'definer_no_search_path'::text,
         (p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')')::text,
         ''::text
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef
    AND NOT EXISTS (
      SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) AS cfg
      WHERE cfg LIKE 'search_path=%'
    );

  -- 7. public storage buckets
  RETURN QUERY
  SELECT 'public_bucket'::text, id::text, ''::text
  FROM storage.buckets
  WHERE public = true;
END;
$$;

-- Lock it down: only service_role may execute (edge function uses service role).
REVOKE ALL ON FUNCTION public._sec_scan_collect() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._sec_scan_collect() TO service_role;

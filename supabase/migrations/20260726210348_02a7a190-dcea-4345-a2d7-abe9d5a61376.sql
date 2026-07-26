-- Force the identity fields on diagnostic records to come from the signed-in
-- session, not from whatever the browser sends. Anonymous reports get NULL.

CREATE OR REPLACE FUNCTION public.error_logs_force_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  NEW.email := CASE WHEN auth.uid() IS NULL THEN NULL
                    ELSE (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()) END;
  NEW.resolved := false;
  NEW.resolved_at := NULL;
  NEW.resolved_by := NULL;
  NEW.route := left(coalesce(NEW.route, ''), 500);
  NEW.user_agent := left(coalesce(NEW.user_agent, ''), 500);
  NEW.stack := left(coalesce(NEW.stack, ''), 8000);
  NEW.message := left(NEW.message, 4000);
  IF NEW.severity NOT IN ('info', 'warn', 'error', 'fatal') THEN
    NEW.severity := 'error';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS error_logs_force_identity_trg ON public.error_logs;
CREATE TRIGGER error_logs_force_identity_trg
BEFORE INSERT ON public.error_logs
FOR EACH ROW EXECUTE FUNCTION public.error_logs_force_identity();

CREATE OR REPLACE FUNCTION public.bug_reports_force_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  NEW.email := CASE WHEN auth.uid() IS NULL THEN NULL
                    ELSE (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()) END;
  NEW.status := 'open';
  NEW.route := left(coalesce(NEW.route, ''), 500);
  NEW.user_agent := left(coalesce(NEW.user_agent, ''), 500);
  NEW.description := left(NEW.description, 4000);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bug_reports_force_identity_trg ON public.bug_reports;
CREATE TRIGGER bug_reports_force_identity_trg
BEFORE INSERT ON public.bug_reports
FOR EACH ROW EXECUTE FUNCTION public.bug_reports_force_identity();
CREATE TABLE IF NOT EXISTS public.service_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  label text NOT NULL,
  status text NOT NULL,
  http_status integer,
  response_ms integer,
  detail text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  run_id uuid NOT NULL,
  triggered_by text NOT NULL DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS service_health_checks_checked_at_idx ON public.service_health_checks (checked_at DESC);
CREATE INDEX IF NOT EXISTS service_health_checks_run_idx ON public.service_health_checks (run_id);

GRANT SELECT ON public.service_health_checks TO authenticated;
GRANT ALL ON public.service_health_checks TO service_role;

ALTER TABLE public.service_health_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view health checks" ON public.service_health_checks;
CREATE POLICY "Admins can view health checks"
  ON public.service_health_checks
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
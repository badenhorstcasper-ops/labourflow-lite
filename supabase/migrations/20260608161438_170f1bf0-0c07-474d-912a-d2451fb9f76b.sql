
-- security_scans
CREATE TABLE public.security_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  triggered_by_email text,
  trigger_type text NOT NULL DEFAULT 'manual',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  critical_count int NOT NULL DEFAULT 0,
  high_count int NOT NULL DEFAULT 0,
  medium_count int NOT NULL DEFAULT 0,
  low_count int NOT NULL DEFAULT 0,
  total_count int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_scans TO authenticated;
GRANT ALL ON public.security_scans TO service_role;

ALTER TABLE public.security_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read scans" ON public.security_scans
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert scans" ON public.security_scans
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update scans" ON public.security_scans
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete scans" ON public.security_scans
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX security_scans_started_at_idx ON public.security_scans (started_at DESC);

-- security_findings
CREATE TABLE public.security_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.security_scans(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  affected_object text,
  remediation text,
  state text NOT NULL DEFAULT 'open',
  ignored_reason text,
  ignored_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ignored_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_findings TO authenticated;
GRANT ALL ON public.security_findings TO service_role;

ALTER TABLE public.security_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read findings" ON public.security_findings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert findings" ON public.security_findings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update findings" ON public.security_findings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete findings" ON public.security_findings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX security_findings_scan_idx ON public.security_findings (scan_id);
CREATE INDEX security_findings_severity_idx ON public.security_findings (severity);

CREATE TRIGGER security_findings_touch_updated_at
  BEFORE UPDATE ON public.security_findings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

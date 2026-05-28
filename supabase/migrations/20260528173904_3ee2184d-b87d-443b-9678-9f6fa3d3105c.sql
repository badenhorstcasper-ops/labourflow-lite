-- 1. Role system (only create if missing)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT TO authenticated USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 2. error_logs
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text NOT NULL DEFAULT upper(substr(encode(extensions.gen_random_bytes(4),'hex'),1,8)),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  email text,
  route text,
  message text NOT NULL,
  stack text,
  user_agent text,
  severity text NOT NULL DEFAULT 'error',
  context jsonb
);

CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_short_id ON public.error_logs (short_id);

GRANT INSERT ON public.error_logs TO anon, authenticated;
GRANT SELECT ON public.error_logs TO authenticated;
GRANT ALL ON public.error_logs TO service_role;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert errors" ON public.error_logs
  FOR INSERT TO anon, authenticated WITH CHECK (length(message) BETWEEN 1 AND 4000);

CREATE POLICY "Admins read all errors" ON public.error_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. bug_reports
CREATE TABLE public.bug_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  email text,
  route text,
  description text NOT NULL,
  last_error_id uuid REFERENCES public.error_logs(id) ON DELETE SET NULL,
  user_agent text,
  status text NOT NULL DEFAULT 'open'
);

CREATE INDEX idx_bug_reports_created_at ON public.bug_reports (created_at DESC);

GRANT INSERT ON public.bug_reports TO anon, authenticated;
GRANT SELECT, UPDATE ON public.bug_reports TO authenticated;
GRANT ALL ON public.bug_reports TO service_role;

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a bug report" ON public.bug_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(description) BETWEEN 1 AND 4000);

CREATE POLICY "Admins read all bug reports" ON public.bug_reports
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update bug reports" ON public.bug_reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

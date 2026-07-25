
-- Enum for submission status
DO $$ BEGIN
  CREATE TYPE public.marketing_submission_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.partner_marketing_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id UUID NOT NULL REFERENCES public.salespersons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT,
  share_with_partners BOOLEAN NOT NULL DEFAULT false,
  status public.marketing_submission_status NOT NULL DEFAULT 'pending',
  reject_reason TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_marketing_submissions TO authenticated;
GRANT ALL ON public.partner_marketing_submissions TO service_role;

ALTER TABLE public.partner_marketing_submissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pms_salesperson ON public.partner_marketing_submissions(salesperson_id);
CREATE INDEX idx_pms_status ON public.partner_marketing_submissions(status);

CREATE TRIGGER pms_touch_updated_at
  BEFORE UPDATE ON public.partner_marketing_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Partner can view own submissions
CREATE POLICY "partner view own submissions"
  ON public.partner_marketing_submissions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.salespersons s
            WHERE s.id = salesperson_id AND s.user_id = auth.uid())
  );

-- Approved partners can view approved+shared submissions from others
CREATE POLICY "approved partners view shared approved"
  ON public.partner_marketing_submissions FOR SELECT TO authenticated
  USING (
    status = 'approved' AND share_with_partners = true
    AND EXISTS (SELECT 1 FROM public.salespersons s
                WHERE s.user_id = auth.uid() AND s.status IN ('active','notice'))
  );

-- Partner can insert own submissions
CREATE POLICY "partner insert own submission"
  ON public.partner_marketing_submissions FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND EXISTS (SELECT 1 FROM public.salespersons s
                WHERE s.id = salesperson_id AND s.user_id = auth.uid()
                  AND s.status IN ('active','notice'))
  );

-- Partner can delete their own pending submission
CREATE POLICY "partner delete own pending"
  ON public.partner_marketing_submissions FOR DELETE TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (SELECT 1 FROM public.salespersons s
                WHERE s.id = salesperson_id AND s.user_id = auth.uid())
  );

-- Admin full access
CREATE POLICY "admin all submissions select"
  ON public.partner_marketing_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin update submissions"
  ON public.partner_marketing_submissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "admin delete submissions"
  ON public.partner_marketing_submissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- ============== Storage policies ==============
-- Replace the existing broad "approved partners can read marketing assets"
DROP POLICY IF EXISTS "approved partners can read marketing assets" ON storage.objects;

-- Approved partners can read official/ folder
CREATE POLICY "partners read official marketing"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'partner-marketing'
    AND (storage.foldername(name))[1] = 'official'
    AND EXISTS (SELECT 1 FROM public.salespersons s
                WHERE s.user_id = auth.uid() AND s.status IN ('active','notice'))
  );

-- Partner can read own submissions folder (submissions/<salesperson_id>/...)
CREATE POLICY "partner read own submission files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'partner-marketing'
    AND (storage.foldername(name))[1] = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.salespersons s
      WHERE s.user_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[2]
    )
  );

-- Approved partners can read approved+shared submission files from others
CREATE POLICY "partners read approved shared submission files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'partner-marketing'
    AND (storage.foldername(name))[1] = 'submissions'
    AND EXISTS (SELECT 1 FROM public.salespersons s
                WHERE s.user_id = auth.uid() AND s.status IN ('active','notice'))
    AND EXISTS (
      SELECT 1 FROM public.partner_marketing_submissions p
      WHERE p.storage_path = name
        AND p.status = 'approved'
        AND p.share_with_partners = true
    )
  );

-- Partner can upload into their own submissions/<own_id>/ folder
CREATE POLICY "partner upload own submission files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'partner-marketing'
    AND (storage.foldername(name))[1] = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.salespersons s
      WHERE s.user_id = auth.uid()
        AND s.status IN ('active','notice')
        AND s.id::text = (storage.foldername(name))[2]
    )
  );

-- Partner can delete own submission files
CREATE POLICY "partner delete own submission files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'partner-marketing'
    AND (storage.foldername(name))[1] = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.salespersons s
      WHERE s.user_id = auth.uid()
        AND s.id::text = (storage.foldername(name))[2]
    )
  );

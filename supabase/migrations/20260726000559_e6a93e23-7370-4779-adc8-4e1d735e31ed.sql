
-- Enum for outcome
DO $$ BEGIN
  CREATE TYPE public.mc_outcome AS ENUM ('pending','verified','inconclusive','discrepancy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Main verifications table
CREATE TABLE public.medical_cert_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_owner_id uuid NOT NULL,
  created_by_user_id uuid NOT NULL,
  employee_name text NOT NULL,
  practitioner_name text NOT NULL,
  practice_number text NOT NULL,
  professional_category text NOT NULL,
  employee_number text,
  incapacity_from date,
  incapacity_to date,
  cert_issued_on date,
  cert_submitted_on date,
  practice_name text,
  practice_address text,
  practice_phone text,
  reason_for_check text,
  cert_file_path text,
  hpcsa_status text,
  pcns_status text,
  results_notes text,
  outcome public.mc_outcome NOT NULL DEFAULT 'pending',
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.medical_cert_verifications TO authenticated;
GRANT ALL ON public.medical_cert_verifications TO service_role;

ALTER TABLE public.medical_cert_verifications ENABLE ROW LEVEL SECURITY;

-- Helper: is caller an active team member of owner?
CREATE OR REPLACE FUNCTION public.is_account_member(_owner uuid, _user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _owner = _user
      OR EXISTS (
        SELECT 1 FROM public.team_members
        WHERE owner_user_id = _owner AND member_user_id = _user AND status = 'active'
      );
$$;

CREATE POLICY "mcv_select_account" ON public.medical_cert_verifications
  FOR SELECT TO authenticated
  USING (public.is_account_member(account_owner_id, auth.uid()));

CREATE POLICY "mcv_insert_account" ON public.medical_cert_verifications
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_account_member(account_owner_id, auth.uid())
    AND created_by_user_id = auth.uid()
    AND locked_at IS NULL
  );

CREATE POLICY "mcv_update_account_when_unlocked" ON public.medical_cert_verifications
  FOR UPDATE TO authenticated
  USING (
    public.is_account_member(account_owner_id, auth.uid())
    AND locked_at IS NULL
  )
  WITH CHECK (
    public.is_account_member(account_owner_id, auth.uid())
  );

-- Immutability trigger: once locked_at set, block further updates
CREATE OR REPLACE FUNCTION public.mcv_block_update_when_locked()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'record_is_locked' USING ERRCODE = 'P0001';
  END IF;
  IF NEW.account_owner_id IS DISTINCT FROM OLD.account_owner_id
     OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'immutable_fields' USING ERRCODE = 'P0001';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER mcv_block_locked
  BEFORE UPDATE ON public.medical_cert_verifications
  FOR EACH ROW EXECUTE FUNCTION public.mcv_block_update_when_locked();

-- Audit log table (append-only)
CREATE TABLE public.medical_cert_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES public.medical_cert_verifications(id) ON DELETE CASCADE,
  account_owner_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  actor_email text,
  action text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.medical_cert_audit_events TO authenticated;
GRANT ALL ON public.medical_cert_audit_events TO service_role;

ALTER TABLE public.medical_cert_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mcae_select_account" ON public.medical_cert_audit_events
  FOR SELECT TO authenticated
  USING (public.is_account_member(account_owner_id, auth.uid()));

CREATE POLICY "mcae_insert_account" ON public.medical_cert_audit_events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_account_member(account_owner_id, auth.uid())
    AND actor_user_id = auth.uid()
  );

-- Block any UPDATE / DELETE via a trigger (no update/delete policy = no access, but be explicit)
CREATE OR REPLACE FUNCTION public.mcae_block_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_events_are_append_only' USING ERRCODE = 'P0001'; END; $$;

CREATE TRIGGER mcae_no_update BEFORE UPDATE ON public.medical_cert_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.mcae_block_mutation();
CREATE TRIGGER mcae_no_delete BEFORE DELETE ON public.medical_cert_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.mcae_block_mutation();

-- Storage policies for medical-certificates bucket
-- Path convention: <account_owner_id>/<verification_id>/<filename>
CREATE POLICY "mc_files_select_account" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'medical-certificates'
    AND public.is_account_member(
      NULLIF(split_part(name, '/', 1), '')::uuid,
      auth.uid()
    )
  );

CREATE POLICY "mc_files_insert_account" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'medical-certificates'
    AND public.is_account_member(
      NULLIF(split_part(name, '/', 1), '')::uuid,
      auth.uid()
    )
  );

CREATE POLICY "mc_files_update_account" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'medical-certificates'
    AND public.is_account_member(
      NULLIF(split_part(name, '/', 1), '')::uuid,
      auth.uid()
    )
  );

CREATE POLICY "mc_files_delete_account" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'medical-certificates'
    AND public.is_account_member(
      NULLIF(split_part(name, '/', 1), '')::uuid,
      auth.uid()
    )
  );

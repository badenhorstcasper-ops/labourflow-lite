
CREATE OR REPLACE FUNCTION public.salespersons_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.full_name IS DISTINCT FROM OLD.full_name
     OR NEW.id_number IS DISTINCT FROM OLD.id_number
     OR NEW.banking_details IS DISTINCT FROM OLD.banking_details
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.notice_end_date IS DISTINCT FROM OLD.notice_end_date
     OR NEW.terminated_reason IS DISTINCT FROM OLD.terminated_reason
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.demo_revoked_at IS DISTINCT FROM OLD.demo_revoked_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'only phone can be self-updated' USING ERRCODE = '42501';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salespersons_guard_self_update ON public.salespersons;
CREATE TRIGGER salespersons_guard_self_update
BEFORE UPDATE ON public.salespersons
FOR EACH ROW EXECUTE FUNCTION public.salespersons_guard_self_update();

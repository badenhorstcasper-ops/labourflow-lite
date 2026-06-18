CREATE TABLE public.chairperson_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_owner_id UUID NOT NULL,
  document_id UUID REFERENCES public.generated_documents(id) ON DELETE SET NULL,
  employer_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  preferred_platform TEXT NOT NULL CHECK (preferred_platform IN ('teams','meet','any')),
  preferred_slots JSONB NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','scheduled','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chairperson_bookings TO authenticated;
GRANT ALL ON public.chairperson_bookings TO service_role;

ALTER TABLE public.chairperson_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own bookings"
  ON public.chairperson_bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = account_owner_id);

CREATE POLICY "User can create own bookings"
  ON public.chairperson_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own bookings"
  ON public.chairperson_bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own bookings"
  ON public.chairperson_bookings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER chairperson_bookings_updated_at
  BEFORE UPDATE ON public.chairperson_bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX chairperson_bookings_user_idx ON public.chairperson_bookings(user_id);
CREATE INDEX chairperson_bookings_owner_idx ON public.chairperson_bookings(account_owner_id);
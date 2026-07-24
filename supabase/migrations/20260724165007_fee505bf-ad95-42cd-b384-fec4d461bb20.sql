CREATE TABLE IF NOT EXISTS public.payfast_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  m_payment_id text NOT NULL UNIQUE,
  pf_payment_id text NULL,
  payfast_token text NULL,
  plan_name text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  billing_date date NULL,
  raw_itn jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payfast_transactions TO authenticated;
GRANT ALL ON public.payfast_transactions TO service_role;

ALTER TABLE public.payfast_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own PayFast transactions" ON public.payfast_transactions;
CREATE POLICY "Users can view own PayFast transactions"
  ON public.payfast_transactions
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = lower(email)
  );

CREATE INDEX IF NOT EXISTS payfast_transactions_user_id_idx ON public.payfast_transactions(user_id);
CREATE INDEX IF NOT EXISTS payfast_transactions_email_idx ON public.payfast_transactions(lower(email));
CREATE INDEX IF NOT EXISTS payfast_transactions_status_idx ON public.payfast_transactions(status);

DROP TRIGGER IF EXISTS touch_payfast_transactions_updated_at ON public.payfast_transactions;
CREATE TRIGGER touch_payfast_transactions_updated_at
  BEFORE UPDATE ON public.payfast_transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
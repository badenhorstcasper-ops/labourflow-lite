CREATE TABLE public.payfast_webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  m_payment_id text UNIQUE,
  pf_payment_id text,
  merchant_id text,
  payment_status text,
  amount_gross numeric,
  plan_name text,
  matched_user_id uuid,
  matched_email text,
  source_ip text,
  outcome text NOT NULL,
  reason text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payfast_webhook_log TO authenticated;
GRANT ALL ON public.payfast_webhook_log TO service_role;

ALTER TABLE public.payfast_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own webhook log"
ON public.payfast_webhook_log
FOR SELECT TO authenticated
USING (auth.uid() = matched_user_id);

CREATE INDEX idx_payfast_webhook_log_user ON public.payfast_webhook_log(matched_user_id, created_at DESC);
CREATE INDEX idx_payfast_webhook_log_created ON public.payfast_webhook_log(created_at DESC);
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paid_until timestamptz,
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS payfast_status text,
  ADD COLUMN IF NOT EXISTS payfast_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS payfast_note text;

CREATE INDEX IF NOT EXISTS subscriptions_paid_until_idx ON public.subscriptions (paid_until);
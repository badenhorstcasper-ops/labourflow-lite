ALTER TABLE public.payfast_transactions
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS recurring_amount numeric,
  ADD COLUMN IF NOT EXISTS offer_kind text;
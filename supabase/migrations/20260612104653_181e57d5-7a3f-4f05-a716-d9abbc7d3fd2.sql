ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS payfast_token text,
  ADD COLUMN IF NOT EXISTS pf_payment_id text;
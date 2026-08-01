ALTER TABLE public.payfast_transactions
  ADD COLUMN IF NOT EXISTS referral_credit_zar numeric NOT NULL DEFAULT 0;
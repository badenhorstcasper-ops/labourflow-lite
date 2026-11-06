-- PROPOSED one-off data cleanup — DO NOT RUN without Casper's explicit OK.
-- Read-only preview first, then the change.

-- A) Trials that already ended but still say 'trialing' (review found 6, Aug–Nov 2026)
select id, email, plan_name, trial_ends_at from public.subscriptions
 where status = 'trialing' and trial_ends_at < now();
-- The migration's expire_stale_trials() does exactly this; running it once is enough:
-- select public.expire_stale_trials();

-- B) Pending Professional subscription stuck since July 2026
select id, email, plan_name, status, created_at, updated_at from public.subscriptions
 where status = 'pending' and updated_at < now() - interval '30 days';
-- update public.subscriptions set status = 'cancelled', payfast_note = 'stale pending cleaned Nov 2026', updated_at = now()
--  where status = 'pending' and updated_at < now() - interval '30 days';

-- C) Junk rows (20 found 6 Nov 2026: empty probes with no merchant id and no payment id) written by the old health-sweep probe into the PayFast webhook log
select count(*) from public.payfast_webhook_log where outcome = 'rejected' and reason like 'bad_merchant_id%' and merchant_id is null and m_payment_id is null;
-- delete from public.payfast_webhook_log where outcome = 'rejected' and reason like 'bad_merchant_id%' and merchant_id is null and m_payment_id is null;

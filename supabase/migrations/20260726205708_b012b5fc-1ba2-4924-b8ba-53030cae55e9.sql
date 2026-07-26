GRANT SELECT ON public.service_health_checks TO authenticated;
GRANT ALL ON public.service_health_checks TO service_role;

SELECT cron.unschedule('nightly-live-health-sweep')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nightly-live-health-sweep');

SELECT cron.schedule(
  'nightly-live-health-sweep',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://riqswihuzclbyjemynyd.supabase.co/functions/v1/live-health-sweep',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
        ''
      )
    ),
    body := '{}'::jsonb
  );
  $$
);
-- Page views: keep anonymous logging working, but validate the data being written.
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Anyone can insert page views"
ON public.page_views
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(path) BETWEEN 1 AND 512
  AND (referrer IS NULL OR length(referrer) <= 1024)
  AND (session_id IS NULL OR length(session_id) <= 128)
  AND (user_agent IS NULL OR length(user_agent) <= 512)
  AND (event IS NULL OR length(event) <= 64)
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- Referral settings: single settings row, readable only by signed-in users, no blanket true.
DROP POLICY IF EXISTS "anyone signed in can read cap" ON public.referral_settings;
CREATE POLICY "Signed-in users can read the referral cap"
ON public.referral_settings
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND id = 1);

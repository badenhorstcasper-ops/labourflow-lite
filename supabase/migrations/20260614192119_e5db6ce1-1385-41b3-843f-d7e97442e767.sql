
-- 1. contact_messages: admins can read
CREATE POLICY "Admins can read contact messages"
ON public.contact_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. share_access_log: allow inserts from anon + authenticated (audit log writes
-- when a shared document is opened). Owners still hold the only SELECT policy.
CREATE POLICY "Anyone can record a share access event"
ON public.share_access_log
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. subscriptions: remove the client-side UPDATE policy entirely. Cancellation
-- and all other writes happen exclusively via the payfast-cancel and
-- payfast-webhook edge functions which use the service role.
DROP POLICY IF EXISTS "Users can cancel their own subscription" ON public.subscriptions;

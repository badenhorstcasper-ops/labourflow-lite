
-- A2: contact_messages
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  plan_interest text,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a contact message"
  ON public.contact_messages FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(name) BETWEEN 1 AND 200 AND
    length(email) BETWEEN 3 AND 254 AND
    length(message) BETWEEN 1 AND 5000 AND
    (subject IS NULL OR length(subject) <= 200) AND
    (plan_interest IS NULL OR length(plan_interest) <= 64)
  );
-- No SELECT/UPDATE/DELETE policy → readable only via service_role (edge functions / admin).

-- A3: share_access_log
CREATE TABLE public.share_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  share_token_prefix text NOT NULL,
  ip_hash text,
  user_agent text,
  outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.share_access_log TO service_role;
GRANT SELECT ON public.share_access_log TO authenticated;
ALTER TABLE public.share_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read access logs for their documents"
  ON public.share_access_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.generated_documents gd
      WHERE gd.id = share_access_log.document_id
        AND gd.owner_user_id = auth.uid()
    )
  );
CREATE INDEX share_access_log_document_id_idx ON public.share_access_log(document_id);
CREATE INDEX share_access_log_created_at_idx ON public.share_access_log(created_at DESC);

-- A3: shorter default share window (7 days)
ALTER TABLE public.generated_documents
  ALTER COLUMN share_expires_at SET DEFAULT (now() + interval '7 days');

-- B1: subscribers can cancel their own subscription
CREATE POLICY "Users can cancel their own subscription"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status IN ('cancelled', 'active', 'pending'));

-- B3: lock down user_devices direct inserts
REVOKE INSERT ON public.user_devices FROM authenticated, anon;

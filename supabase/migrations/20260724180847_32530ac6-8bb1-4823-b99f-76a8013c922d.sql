
CREATE POLICY "partners can read marketing assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-marketing');

CREATE POLICY "admins manage marketing assets"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'partner-marketing' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'partner-marketing' AND public.has_role(auth.uid(), 'admin'));

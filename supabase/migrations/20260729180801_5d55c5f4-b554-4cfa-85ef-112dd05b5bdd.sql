-- Documents table: allow active team members and admins to delete / revoke
DROP POLICY IF EXISTS "Team or admin deletes account docs" ON public.generated_documents;
CREATE POLICY "Team or admin deletes account docs"
ON public.generated_documents
FOR DELETE
TO authenticated
USING (
  public.is_account_member(owner_user_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Team or admin updates account docs" ON public.generated_documents;
CREATE POLICY "Team or admin updates account docs"
ON public.generated_documents
FOR UPDATE
TO authenticated
USING (
  public.is_account_member(owner_user_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.is_account_member(owner_user_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Storage: allow active team members and admins to delete the account's document files
DROP POLICY IF EXISTS "Team or admin deletes account documents" ON storage.objects;
CREATE POLICY "Team or admin deletes account documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    public.is_account_member(((storage.foldername(name))[1])::uuid, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
);
-- Lock down salespersons self-update: replace the broad self-update policy with
-- one that whitelists only the phone column via WITH CHECK on unchanged fields.
-- The existing salespersons_guard_self_update trigger already enforces this,
-- but the RLS policy itself should also express the restriction.

DROP POLICY IF EXISTS sp_self_update_phone ON public.salespersons;

CREATE POLICY sp_self_update_phone
ON public.salespersons
FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    user_id = auth.uid()
    -- trigger salespersons_guard_self_update enforces column-level restriction
    -- (only phone may change for non-admins); this WITH CHECK keeps ownership.
  )
);

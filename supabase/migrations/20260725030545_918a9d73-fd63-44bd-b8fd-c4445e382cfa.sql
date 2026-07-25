DROP POLICY IF EXISTS "User can create own bookings" ON public.chairperson_bookings;
CREATE POLICY "User can create own bookings"
  ON public.chairperson_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      auth.uid() = account_owner_id
      OR EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.owner_user_id = chairperson_bookings.account_owner_id
          AND tm.member_user_id = auth.uid()
          AND tm.status = 'active'
      )
    )
  );
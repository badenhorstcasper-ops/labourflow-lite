
-- user_devices: add INSERT policy tying user_id to auth.uid()
CREATE POLICY "User can insert own device"
ON public.user_devices
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- chairperson_bookings: allow account owner and active team members to update/delete
DROP POLICY IF EXISTS "Owner can update own bookings" ON public.chairperson_bookings;
DROP POLICY IF EXISTS "Owner can delete own bookings" ON public.chairperson_bookings;

CREATE POLICY "Owner or account owner can update bookings"
ON public.chairperson_bookings
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = account_owner_id
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.owner_user_id = chairperson_bookings.account_owner_id
      AND tm.member_user_id = auth.uid()
      AND tm.status = 'active'
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR auth.uid() = account_owner_id
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.owner_user_id = chairperson_bookings.account_owner_id
      AND tm.member_user_id = auth.uid()
      AND tm.status = 'active'
  )
);

CREATE POLICY "Owner or account owner can delete bookings"
ON public.chairperson_bookings
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR auth.uid() = account_owner_id
  OR EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.owner_user_id = chairperson_bookings.account_owner_id
      AND tm.member_user_id = auth.uid()
      AND tm.status = 'active'
  )
);

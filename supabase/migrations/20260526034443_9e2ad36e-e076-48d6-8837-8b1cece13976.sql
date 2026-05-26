-- 1. team_members: add invite_token + accepted_at
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS invite_token text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- Backfill any existing rows with a unique token
UPDATE public.team_members
   SET invite_token = encode(gen_random_bytes(16), 'hex')
 WHERE invite_token IS NULL;

ALTER TABLE public.team_members
  ALTER COLUMN invite_token SET NOT NULL,
  ALTER COLUMN invite_token SET DEFAULT encode(gen_random_bytes(16), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS team_members_invite_token_key
  ON public.team_members (invite_token);

-- Allow anyone with a token to look up the row by token (read-only, no PII leak: only their own invite)
-- Actually, accept happens via SECURITY DEFINER function so no extra policy needed.

-- 2. user_devices table
CREATE TABLE IF NOT EXISTS public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  label text,
  user_agent text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own devices"
  ON public.user_devices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "User can update own device label"
  ON public.user_devices FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User can delete own device"
  ON public.user_devices FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT policy: inserts only via register_device() SECURITY DEFINER function.

-- 3. register_device function (2-device cap, blocks 3rd new device)
CREATE OR REPLACE FUNCTION public.register_device(
  _device_id text,
  _label text DEFAULT NULL,
  _ua text DEFAULT NULL
)
RETURNS public.user_devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing public.user_devices;
  device_count int;
  result public.user_devices;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;
  IF _device_id IS NULL OR length(_device_id) < 8 THEN
    RAISE EXCEPTION 'invalid_device_id' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO existing FROM public.user_devices
    WHERE user_id = uid AND device_id = _device_id;

  IF FOUND THEN
    UPDATE public.user_devices
       SET last_seen_at = now(),
           user_agent = COALESCE(_ua, user_agent),
           label = COALESCE(_label, label)
     WHERE id = existing.id
    RETURNING * INTO result;
    RETURN result;
  END IF;

  SELECT count(*) INTO device_count FROM public.user_devices WHERE user_id = uid;
  IF device_count >= 2 THEN
    RAISE EXCEPTION 'device_limit_reached' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.user_devices (user_id, device_id, label, user_agent)
  VALUES (uid, _device_id, _label, _ua)
  RETURNING * INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_device(text, text, text) TO authenticated;

-- 4. accept_team_invite function
CREATE OR REPLACE FUNCTION public.accept_team_invite(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  email_val text;
  inv public.team_members;
  owner_plan text;
  seat_cap int;
  seats_used int;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = 'P0001';
  END IF;

  SELECT email INTO email_val FROM auth.users WHERE id = uid;

  SELECT * INTO inv FROM public.team_members WHERE invite_token = _token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_invalid' USING ERRCODE = 'P0001';
  END IF;
  IF inv.status = 'active' AND inv.member_user_id IS NOT NULL AND inv.member_user_id <> uid THEN
    RAISE EXCEPTION 'invite_already_used' USING ERRCODE = 'P0001';
  END IF;

  SELECT plan_name INTO owner_plan
    FROM public.subscriptions
   WHERE user_id = inv.owner_user_id
   ORDER BY updated_at DESC NULLS LAST
   LIMIT 1;

  seat_cap := CASE COALESCE(owner_plan, 'Solo')
    WHEN 'Solo' THEN 1
    WHEN 'Business' THEN 5
    WHEN 'Professional' THEN 10
    WHEN 'Enterprise' THEN 15
    ELSE 1
  END;

  SELECT count(*) INTO seats_used
    FROM public.team_members
   WHERE owner_user_id = inv.owner_user_id
     AND status = 'active';

  -- +1 for owner; if this invite is not yet active we'd be adding one
  IF inv.status <> 'active' AND (seats_used + 1) >= seat_cap THEN
    RAISE EXCEPTION 'seat_limit_reached' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.team_members
     SET member_user_id = uid,
         member_email = COALESCE(email_val, member_email),
         status = 'active',
         joined_at = COALESCE(joined_at, now()),
         accepted_at = now()
   WHERE id = inv.id;

  RETURN jsonb_build_object(
    'owner_user_id', inv.owner_user_id,
    'plan_name', COALESCE(owner_plan, 'Solo')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_team_invite(text) TO authenticated;
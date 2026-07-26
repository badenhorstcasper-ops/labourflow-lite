CREATE OR REPLACE FUNCTION public.mcae_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN RAISE EXCEPTION 'audit_events_are_append_only' USING ERRCODE = 'P0001'; END;
$function$;
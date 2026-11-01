-- Harden group moderation RPC permissions.
-- SECURITY: group membership changes must only be callable by authenticated users,
-- and the function must reject missing auth.uid() before evaluating roles.

CREATE OR REPLACE FUNCTION public.community_group_kick_member(p_group uuid, p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_role text;
  v_target_role text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authentication_required'
      USING ERRCODE = '42501';
  END IF;

  IF p_group IS NULL OR p_user IS NULL THEN
    RAISE EXCEPTION 'invalid_request'
      USING ERRCODE = '22023';
  END IF;

  SELECT role
    INTO v_role
    FROM public.community_group_members
   WHERE group_id = p_group
     AND user_id = v_actor;

  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501';
  END IF;

  SELECT role
    INTO v_target_role
    FROM public.community_group_members
   WHERE group_id = p_group
     AND user_id = p_user;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'member_not_found'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_target_role = 'owner' OR p_user = v_actor THEN
    RAISE EXCEPTION 'cannot_kick'
      USING ERRCODE = '42501';
  END IF;

  IF v_role = 'admin' AND v_target_role = 'admin' THEN
    RAISE EXCEPTION 'admin_cannot_kick_admin'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.community_group_members
   WHERE group_id = p_group
     AND user_id = p_user;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Explicitly remove default PUBLIC/anon execution and grant only authenticated
-- execution to the user-facing moderation RPC.
REVOKE ALL ON FUNCTION public.community_group_kick_member(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_kick_member(uuid, uuid)
  TO authenticated;

-- This is a trigger function, not a client RPC. Remove direct client execution.
REVOKE ALL ON FUNCTION public.community_group_add_creator_owner()
  FROM PUBLIC, anon, authenticated;

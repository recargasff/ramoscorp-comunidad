-- Standalone regression test for the community group moderation RPC.
-- Runs in a disposable PostgreSQL instance in GitHub Actions, not production.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;

CREATE TABLE public.community_group_members (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  PRIMARY KEY (group_id, user_id)
);
CREATE FUNCTION public.community_group_add_creator_owner()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;

-- Apply the migration's function definition and privilege changes.
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
    RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501';
  END IF;
  IF p_group IS NULL OR p_user IS NULL THEN
    RAISE EXCEPTION 'invalid_request' USING ERRCODE = '22023';
  END IF;

  SELECT role INTO v_role
  FROM public.community_group_members
  WHERE group_id = p_group AND user_id = v_actor;

  IF v_role IS NULL OR v_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_target_role
  FROM public.community_group_members
  WHERE group_id = p_group AND user_id = p_user;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_target_role = 'owner' OR p_user = v_actor THEN
    RAISE EXCEPTION 'cannot_kick' USING ERRCODE = '42501';
  END IF;
  IF v_role = 'admin' AND v_target_role = 'admin' THEN
    RAISE EXCEPTION 'admin_cannot_kick_admin' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.community_group_members
  WHERE group_id = p_group AND user_id = p_user;
  RETURN jsonb_build_object('success', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.community_group_kick_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_group_kick_member(uuid, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.community_group_add_creator_owner() FROM PUBLIC, anon, authenticated;

-- Privilege regression assertions.
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.community_group_kick_member(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute community_group_kick_member';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.community_group_kick_member(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must execute community_group_kick_member';
  END IF;
  IF has_function_privilege('anon', 'public.community_group_add_creator_owner()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not execute trigger function';
  END IF;
  IF has_function_privilege('authenticated', 'public.community_group_add_creator_owner()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not execute trigger function';
  END IF;
END
$$;

INSERT INTO public.community_group_members VALUES
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','owner'),
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','admin'),
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','admin'),
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004','member'),
('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000005','member');

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, DELETE ON public.community_group_members TO authenticated;

SET ROLE authenticated;
DO $$
DECLARE
  v_result jsonb;
BEGIN
  -- Member cannot remove anyone.
  PERFORM set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000004',true);
  BEGIN
    PERFORM public.community_group_kick_member('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000005');
    RAISE EXCEPTION 'member unexpectedly kicked another member';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Admin cannot remove another admin.
  PERFORM set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000002',true);
  BEGIN
    PERFORM public.community_group_kick_member('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003');
    RAISE EXCEPTION 'admin unexpectedly kicked another admin';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Neither admin nor owner can kick the owner.
  BEGIN
    PERFORM public.community_group_kick_member('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'owner unexpectedly kicked';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Admin can remove a regular member.
  v_result := public.community_group_kick_member('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000004');
  IF v_result->>'success' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'expected successful member removal';
  END IF;
END
$$;
RESET ROLE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.community_group_members WHERE user_id='20000000-0000-0000-0000-000000000004') THEN
    RAISE EXCEPTION 'regular member should have been removed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_group_members WHERE user_id='20000000-0000-0000-0000-000000000003') THEN
    RAISE EXCEPTION 'admin should remain in group';
  END IF;
END
$$;

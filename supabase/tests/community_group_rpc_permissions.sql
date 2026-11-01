-- Run after migrations in a Supabase test database.
-- These assertions ensure client roles cannot invoke the trigger-only function
-- and anonymous callers cannot execute the moderation RPC.
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

-- Restrict a trigger-only SECURITY DEFINER function from direct API execution.
-- The trigger continues to execute as PostgreSQL invokes it during INSERT.
REVOKE EXECUTE ON FUNCTION public.community_group_ensure_creator_membership()
  FROM PUBLIC, anon, authenticated, service_role;

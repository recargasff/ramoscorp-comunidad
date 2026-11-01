# Security review: community RPC authorization

## Scope
Reviewed community group moderation RPC permissions and the trigger-only creator/owner function.

## Required remediation
- Reject calls to `community_group_kick_member` without `auth.uid()`.
- Require the caller to be a group owner/admin.
- Prevent self-removal and removal of the owner; prevent admins removing peer admins.
- Revoke execution from `PUBLIC` and `anon`; grant the moderation RPC to `authenticated`.
- Revoke direct execution of `community_group_add_creator_owner()` from client roles.

## Validation
Run `supabase/tests/community_group_rpc_permissions.sql` in a test database after migrations.
Also manually verify owner/admin/member/anonymous behavior before merge.

## Deployment
This PR does not apply migrations or deploy production. Apply the migration through the approved workflow after review and verification.

-- RamosCorp Comunidad privacy controls.
-- This RPC removes only community-scoped user data and keeps auth.users intact.
create or replace function public.community_delete_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_user uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  delete from public.community_comments where author_id = v_user;
  delete from public.community_posts where author_id = v_user;
  delete from public.community_direct_messages where sender_id = v_user or recipient_id = v_user;
  delete from public.community_group_messages where author_id = v_user;
  delete from public.community_friendships where requester_id = v_user or addressee_id = v_user;
  delete from public.community_group_members where user_id = v_user;
  delete from public.community_group_blocks where user_id = v_user;
  delete from public.community_group_chat_clears where user_id = v_user;
  delete from public.community_group_reports where reporter_id = v_user;
  delete from public.community_reports where reporter_id = v_user;
  delete from public.community_notifications where user_id = v_user or actor_id = v_user;
  delete from public.community_notification_subscriptions where user_id = v_user;
  delete from public.community_poll_votes where user_id = v_user;
  delete from public.community_reactions where user_id = v_user;
  delete from public.community_saved_posts where user_id = v_user;
  delete from public.contact_requests
    where v_email <> ''
      and lower(email) = v_email
      and subject = 'Feedback de RamosCorp Comunidad';

  delete from storage.objects
    where bucket_id = 'community-avatars'
      and (name = v_user::text or name like v_user::text || '/%');

  delete from public.community_profiles where user_id = v_user;

  return jsonb_build_object('success', true, 'scope', 'community', 'account_retained', true);
end;
$$;

revoke all on function public.community_delete_my_data() from public, anon;
grant execute on function public.community_delete_my_data() to authenticated;

create table if not exists public.community_account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','reviewing','completed','rejected')),
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.community_account_deletion_requests enable row level security;
create policy "Users can view own account deletion requests"
  on public.community_account_deletion_requests for select to authenticated
  using (auth.uid() = user_id);
revoke all on public.community_account_deletion_requests from anon, authenticated;
grant select on public.community_account_deletion_requests to authenticated;

create or replace function public.community_request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email',''));
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if v_email = '' then raise exception 'Account email unavailable'; end if;
  if exists (select 1 from public.community_account_deletion_requests
             where user_id = v_user and status in ('pending','reviewing')) then
    return jsonb_build_object('success',true,'status','pending');
  end if;
  insert into public.community_account_deletion_requests(user_id,email)
  values(v_user,v_email);
  return jsonb_build_object('success',true,'status','pending');
end;
$$;
revoke all on function public.community_request_account_deletion() from public, anon;
grant execute on function public.community_request_account_deletion() to authenticated;

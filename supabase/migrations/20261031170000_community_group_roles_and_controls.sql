-- Group roles and chat management for RamosCorp Comunidad.
alter table public.community_group_members
  add column if not exists role text not null default 'member'
  check (role in ('owner','admin','member'));

update public.community_group_members m
set role='owner'
from public.community_groups g
where g.id=m.group_id and g.creator_id=m.user_id;

create or replace function public.community_group_is_admin(p_group uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.community_group_members m where m.group_id=p_group and m.user_id=p_user and m.role in ('owner','admin')) $$;
revoke all on function public.community_group_is_admin(uuid,uuid) from public,anon;
grant execute on function public.community_group_is_admin(uuid,uuid) to authenticated;

create or replace function public.community_group_set_role(p_group uuid,p_user uuid,p_role text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_actor uuid:=auth.uid(); v_owner uuid;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 if p_role not in ('admin','member') then raise exception 'Invalid role'; end if;
 select creator_id into v_owner from public.community_groups where id=p_group for update;
 if not found then raise exception 'Group not found'; end if;
 if v_actor<>v_owner and not public.community_group_is_admin(p_group,v_actor) then raise exception 'Admin required'; end if;
 if v_actor<>v_owner and p_role='admin' then raise exception 'Only the owner can appoint admins'; end if;
 if p_user=v_owner then raise exception 'Owner role cannot be changed'; end if;
 update public.community_group_members set role=p_role where group_id=p_group and user_id=p_user;
 if not found then raise exception 'Member not found'; end if;
 return jsonb_build_object('success',true,'role',p_role);
end $$;
revoke all on function public.community_group_set_role(uuid,uuid,text) from public,anon;
grant execute on function public.community_group_set_role(uuid,uuid,text) to authenticated;

create or replace function public.community_group_transfer_owner(p_group uuid,p_user uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_actor uuid:=auth.uid(); v_owner uuid;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 select creator_id into v_owner from public.community_groups where id=p_group for update;
 if not found then raise exception 'Group not found'; end if;
 if v_actor<>v_owner then raise exception 'Only the owner can transfer ownership'; end if;
 if p_user=v_owner or not exists(select 1 from public.community_group_members where group_id=p_group and user_id=p_user and role='admin') then
   raise exception 'Select another group admin';
 end if;
 update public.community_group_members set role='admin' where group_id=p_group and user_id=v_owner;
 update public.community_group_members set role='owner' where group_id=p_group and user_id=p_user;
 update public.community_groups set creator_id=p_user where id=p_group;
 return jsonb_build_object('success',true,'owner_id',p_user);
end $$;
revoke all on function public.community_group_transfer_owner(uuid,uuid) from public,anon;
grant execute on function public.community_group_transfer_owner(uuid,uuid) to authenticated;

create or replace function public.community_group_leave(p_group uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_actor uuid:=auth.uid(); v_owner uuid;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 select creator_id into v_owner from public.community_groups where id=p_group for update;
 if not found then raise exception 'Group not found'; end if;
 if v_actor=v_owner then raise exception 'Transfer ownership before leaving'; end if;
 delete from public.community_group_members where group_id=p_group and user_id=v_actor;
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.community_group_leave(uuid) from public,anon;
grant execute on function public.community_group_leave(uuid) to authenticated;

create or replace function public.community_group_delete(p_group uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_actor uuid:=auth.uid(); v_owner uuid;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 select creator_id into v_owner from public.community_groups where id=p_group for update;
 if not found then raise exception 'Group not found'; end if;
 if v_actor<>v_owner and not public.community_group_is_admin(p_group,v_actor) then raise exception 'Admin required'; end if;
 delete from public.community_groups where id=p_group;
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.community_group_delete(uuid) from public,anon;
grant execute on function public.community_group_delete(uuid) to authenticated;

create or replace function public.community_group_update_image(p_group uuid,p_image_url text)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 if not public.community_group_is_admin(p_group,v_actor) then raise exception 'Admin required'; end if;
 if p_image_url is not null and (length(p_image_url)>2048 or p_image_url !~ '^https://[^ ]+/storage/v1/object/public/community-avatars/' ) then
   raise exception 'Invalid image URL';
 end if;
 update public.community_groups set image_url=coalesce(p_image_url,'') where id=p_group;
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.community_group_update_image(uuid,text) from public,anon;
grant execute on function public.community_group_update_image(uuid,text) to authenticated;

create or replace function public.community_group_report(p_group uuid,p_reason text,p_details text default '')
returns jsonb language plpgsql security definer set search_path=public
as $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 if p_reason not in ('spam','abuse','inappropriate','scam','other') then raise exception 'Invalid report reason'; end if;
 if not exists(select 1 from public.community_groups where id=p_group) then raise exception 'Group not found'; end if;
 insert into public.community_group_reports(reporter_id,group_id,reason,details)
 values(v_actor,p_group,p_reason,left(coalesce(p_details,''),2000)) returning id into v_id;
 return jsonb_build_object('success',true,'report_id',v_id);
end $$;
revoke all on function public.community_group_report(uuid,text,text) from public,anon;
grant execute on function public.community_group_report(uuid,text,text) to authenticated;

create or replace function public.community_group_ensure_creator_membership()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
 if new.creator_id is not null then
  insert into public.community_group_members(group_id,user_id,role)
  values(new.id,new.creator_id,'owner')
  on conflict(group_id,user_id) do update set role='owner';
 end if;
 return new;
end $$;
drop trigger if exists community_group_creator_membership on public.community_groups;
create trigger community_group_creator_membership
after insert on public.community_groups
for each row execute function public.community_group_ensure_creator_membership();

create or replace function public.community_group_guard_role()
returns trigger language plpgsql set search_path=public
as $$
begin
 if new.role is distinct from old.role then
  if auth.uid() is not null then raise exception 'Use group role RPC'; end if;
 end if;
 return new;
end $$;
drop trigger if exists community_group_members_guard_role on public.community_group_members;
create trigger community_group_members_guard_role
before update on public.community_group_members
for each row execute function public.community_group_guard_role();

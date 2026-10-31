-- RamosCorp Comunidad integrity guards.
-- Direct-message recipients may update only read_at; participants and message content are immutable.
create or replace function public.community_guard_direct_message_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.sender_id is distinct from old.sender_id
     or new.recipient_id is distinct from old.recipient_id
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'Direct-message content and participants are immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists community_direct_messages_guard_update
  on public.community_direct_messages;
create trigger community_direct_messages_guard_update
before update on public.community_direct_messages
for each row execute function public.community_guard_direct_message_update();

-- Friendship participants and creation time are immutable after request creation.
-- This prevents an addressee from repointing an existing relationship to another user.
create or replace function public.community_guard_friendship_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.requester_id is distinct from old.requester_id
     or new.addressee_id is distinct from old.addressee_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Friendship participants are immutable';
  end if;

  if new.status is distinct from old.status
     and not (
       old.status = 'pending'
       and new.status in ('accepted', 'declined', 'blocked')
     )
     and not (
       old.status = 'accepted'
       and new.status = 'blocked'
     ) then
    raise exception 'Invalid friendship status transition';
  end if;

  return new;
end;
$$;

drop trigger if exists community_friendships_guard_update
  on public.community_friendships;
create trigger community_friendships_guard_update
before update on public.community_friendships
for each row execute function public.community_guard_friendship_update();

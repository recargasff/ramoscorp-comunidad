-- Accurate, complete community point totals independent of the 100-post feed window.
-- Hidden content and self-reactions do not award points. Deleted activity is naturally removed.
create function private.community_get_my_stats()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_post_count bigint := 0;
  v_comment_count bigint := 0;
  v_received_reaction_count bigint := 0;
  v_points bigint := 0;
  v_level bigint := 1;
  v_level_progress bigint := 0;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  select count(*) into v_post_count
  from public.community_posts p
  where p.author_id = v_user_id and p.is_hidden is false;

  select count(*) into v_comment_count
  from public.community_comments c
  join public.community_posts p on p.id = c.post_id
  where c.author_id = v_user_id
    and c.is_hidden is false
    and p.is_hidden is false;

  select count(*) into v_received_reaction_count
  from public.community_reactions r
  join public.community_posts p on p.id = r.post_id
  where p.author_id = v_user_id
    and p.is_hidden is false
    and r.user_id <> v_user_id;

  v_points := (v_post_count * 5) + (v_comment_count * 2) + v_received_reaction_count;
  v_level := floor(v_points::numeric / 25)::bigint + 1;
  v_level_progress := mod(v_points, 25);

  return jsonb_build_object(
    'post_count', v_post_count,
    'comment_count', v_comment_count,
    'received_reaction_count', v_received_reaction_count,
    'points', v_points,
    'level', v_level,
    'level_progress', v_level_progress,
    'points_to_next', 25 - v_level_progress
  );
end;
$function$;

revoke all on function private.community_get_my_stats() from public, anon;
grant execute on function private.community_get_my_stats() to authenticated, service_role;

create or replace function public.community_get_my_stats()
returns jsonb
language sql
security invoker
set search_path = ''
as $function$
  select private.community_get_my_stats();
$function$;

revoke all on function public.community_get_my_stats() from public, anon;
grant execute on function public.community_get_my_stats() to authenticated, service_role;

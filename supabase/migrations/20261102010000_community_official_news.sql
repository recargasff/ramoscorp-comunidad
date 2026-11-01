create table if not exists public.community_post_news (
  post_id uuid primary key references public.community_posts(id) on delete cascade,
  marked_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.community_post_news enable row level security;

drop policy if exists "Community news is readable by everyone" on public.community_post_news;
create policy "Community news is readable by everyone"
on public.community_post_news for select
to anon, authenticated
using (true);

drop policy if exists "Verified community admins can publish news" on public.community_post_news;
create policy "Verified community admins can publish news"
on public.community_post_news for insert
to authenticated
with check (
  marked_by = auth.uid()
  and exists (select 1 from public.community_admins a where a.user_id = auth.uid())
  and exists (select 1 from public.community_verified_users v where v.user_id = auth.uid())
);

drop policy if exists "Verified community admins can unmark news" on public.community_post_news;
create policy "Verified community admins can unmark news"
on public.community_post_news for delete
to authenticated
using (
  exists (select 1 from public.community_admins a where a.user_id = auth.uid())
  and exists (select 1 from public.community_verified_users v where v.user_id = auth.uid())
);

create or replace function public.notify_community_news()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
begin
  select author_id into post_author
  from public.community_posts
  where id = new.post_id;

  insert into public.community_notifications
    (user_id, type, title, body, actor_id, related_news_id, data)
  select
    u.id,
    'news',
    'Nueva noticia oficial de Ramoscorp Comunidad',
    'Hay una nueva noticia oficial. Tócala para verla.',
    coalesce(new.marked_by, post_author),
    new.post_id,
    jsonb_build_object('post_id', new.post_id, 'news', true)
  from auth.users u;

  return new;
end;
$$;

drop trigger if exists community_post_news_notify on public.community_post_news;
create trigger community_post_news_notify
after insert on public.community_post_news
for each row execute function public.notify_community_news();
-- RamosCorp Comunidad: developer networking foundation.
-- Adds developer-specific data without modifying existing community tables or rows.

create table if not exists public.developer_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 120),
  summary text not null default '' check (char_length(summary) <= 1000),
  description text not null default '' check (char_length(description) <= 10000),
  status text not null default 'building' check (status in ('idea','building','completed','paused')),
  technologies text[] not null default '{}'::text[] check (cardinality(technologies) <= 20),
  repository_url text,
  demo_url text,
  looking_for_collaborators boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint developer_projects_repository_url_valid
    check (repository_url is null or repository_url ~* '^https?://'),
  constraint developer_projects_demo_url_valid
    check (demo_url is null or demo_url ~* '^https?://')
);

create index if not exists developer_projects_owner_updated_idx
  on public.developer_projects(owner_id, updated_at desc);
create index if not exists developer_projects_discovery_idx
  on public.developer_projects(looking_for_collaborators, status, updated_at desc);

alter table public.developer_projects enable row level security;

drop policy if exists "Developer projects are publicly discoverable" on public.developer_projects;
create policy "Developer projects are publicly discoverable"
  on public.developer_projects for select to anon, authenticated
  using (true);

drop policy if exists "Users create their own developer projects" on public.developer_projects;
create policy "Users create their own developer projects"
  on public.developer_projects for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners update their developer projects" on public.developer_projects;
create policy "Owners update their developer projects"
  on public.developer_projects for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners delete their developer projects" on public.developer_projects;
create policy "Owners delete their developer projects"
  on public.developer_projects for delete to authenticated
  using (owner_id = (select auth.uid()));

create table if not exists public.developer_collaboration_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.developer_projects(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint developer_collaboration_no_self_request check (requester_id <> recipient_id)
);

create index if not exists developer_collaboration_recipient_idx
  on public.developer_collaboration_requests(recipient_id, status, created_at desc);
create index if not exists developer_collaboration_requester_idx
  on public.developer_collaboration_requests(requester_id, created_at desc);

alter table public.developer_collaboration_requests enable row level security;

-- Recipients may only change the status when responding; keep requester, project,
-- recipient, and message immutable through the authenticated API.
revoke update on public.developer_collaboration_requests from authenticated;
grant update (status) on public.developer_collaboration_requests to authenticated;

drop policy if exists "Participants can view collaboration requests" on public.developer_collaboration_requests;
create policy "Participants can view collaboration requests"
  on public.developer_collaboration_requests for select to authenticated
  using ((select auth.uid()) in (requester_id, recipient_id));

drop policy if exists "Authenticated users send collaboration requests" on public.developer_collaboration_requests;
create policy "Authenticated users send collaboration requests"
  on public.developer_collaboration_requests for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and recipient_id <> (select auth.uid())
    and (project_id is null or exists (
      select 1 from public.developer_projects p
      where p.id = project_id and p.owner_id = recipient_id
    ))
  );

drop policy if exists "Recipients respond to collaboration requests" on public.developer_collaboration_requests;
create policy "Recipients respond to collaboration requests"
  on public.developer_collaboration_requests for update to authenticated
  using (recipient_id = (select auth.uid()) and status = 'pending')
  with check (
    recipient_id = (select auth.uid())
    and status in ('accepted','declined')
  );

drop policy if exists "Requesters cancel pending collaboration requests" on public.developer_collaboration_requests;
create policy "Requesters cancel pending collaboration requests"
  on public.developer_collaboration_requests for delete to authenticated
  using (requester_id = (select auth.uid()) and status = 'pending');

create table if not exists public.developer_resources (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  category text not null default 'other'
    check (category in ('documentation','course','tutorial','tool','question','other')),
  technology text,
  resource_url text not null check (resource_url ~* '^https?://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists developer_resources_discovery_idx
  on public.developer_resources(category, technology, created_at desc);

alter table public.developer_resources enable row level security;

drop policy if exists "Developer resources are publicly discoverable" on public.developer_resources;
create policy "Developer resources are publicly discoverable"
  on public.developer_resources for select to anon, authenticated
  using (true);

drop policy if exists "Users publish their own developer resources" on public.developer_resources;
create policy "Users publish their own developer resources"
  on public.developer_resources for insert to authenticated
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors update their own developer resources" on public.developer_resources;
create policy "Authors update their own developer resources"
  on public.developer_resources for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

drop policy if exists "Authors delete their own developer resources" on public.developer_resources;
create policy "Authors delete their own developer resources"
  on public.developer_resources for delete to authenticated
  using (author_id = (select auth.uid()));

-- Keep updated_at accurate on edits.
create or replace function public.developer_set_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists developer_projects_set_updated_at on public.developer_projects;
create trigger developer_projects_set_updated_at
  before update on public.developer_projects
  for each row execute function public.developer_set_updated_at();

drop trigger if exists developer_resources_set_updated_at on public.developer_resources;
create trigger developer_resources_set_updated_at
  before update on public.developer_resources
  for each row execute function public.developer_set_updated_at();

drop trigger if exists developer_collaboration_requests_set_updated_at on public.developer_collaboration_requests;
create trigger developer_collaboration_requests_set_updated_at
  before update on public.developer_collaboration_requests
  for each row execute function public.developer_set_updated_at();


-- Prevent recipients from rewriting the request while responding to it.
-- RLS controls who may update the row; this trigger limits the allowed transition.
create or replace function public.developer_guard_collaboration_response()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.project_id is distinct from old.project_id
    or new.requester_id is distinct from old.requester_id
    or new.recipient_id is distinct from old.recipient_id
    or new.message is distinct from old.message
    or new.created_at is distinct from old.created_at then
    raise exception 'Collaboration request details cannot be changed';
  end if;

  if old.status <> 'pending' or new.status not in ('accepted', 'declined') then
    raise exception 'Only pending requests may be accepted or declined';
  end if;

  return new;
end;
$$;

drop trigger if exists developer_collaboration_guard_response on public.developer_collaboration_requests;
create trigger developer_collaboration_guard_response
  before update on public.developer_collaboration_requests
  for each row execute function public.developer_guard_collaboration_response();

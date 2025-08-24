-- Family groups and sharing for scheduled tasks

-- Helper function to update timestamps (reused)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Family groups table
create table if not exists public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  join_code text not null unique default substr(encode(gen_random_bytes(16),'hex'),1,8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_groups enable row level security;

create trigger if not exists update_family_groups_updated_at
before update on public.family_groups
for each row execute function public.update_updated_at_column();

-- Group members
create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table public.group_members enable row level security;

create index if not exists idx_group_members_group on public.group_members(group_id);
create index if not exists idx_group_members_user on public.group_members(user_id);

-- Helper functions for RLS
create or replace function public.is_group_member(_group_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = _group_id and gm.user_id = _user_id
  );
$$;

create or replace function public.is_group_owner(_group_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_groups fg
    where fg.id = _group_id and fg.owner_id = _user_id
  );
$$;

-- Secure join by code
create or replace function public.join_group(_join_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select id into v_group_id from public.family_groups where join_code = _join_code;

  if v_group_id is null then
    raise exception 'invalid join code';
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group_id, v_user_id)
  on conflict do nothing;

  return v_group_id;
end;
$$;

-- RLS policies
-- family_groups
create policy if not exists "Members can view their groups"
on public.family_groups
for select
to authenticated
using (public.is_group_member(id) or owner_id = auth.uid());

create policy if not exists "Users can create groups they own"
on public.family_groups
for insert
to authenticated
with check (owner_id = auth.uid());

create policy if not exists "Only owner can update groups"
on public.family_groups
for update
to authenticated
using (owner_id = auth.uid());

create policy if not exists "Only owner can delete groups"
on public.family_groups
for delete
to authenticated
using (owner_id = auth.uid());

-- group_members
create policy if not exists "Members can view their group members"
on public.group_members
for select
to authenticated
using (public.is_group_member(group_id));

create policy if not exists "Owner can remove members"
on public.group_members
for delete
to authenticated
using (public.is_group_owner(group_id));

create policy if not exists "User can leave group"
on public.group_members
for delete
to authenticated
using (user_id = auth.uid());

-- scheduled_tasks: add group_id and update RLS for sharing
alter table public.scheduled_tasks
add column if not exists group_id uuid references public.family_groups(id) on delete set null;

-- Drop old policies if they exist
drop policy if exists "Users can view their own tasks" on public.scheduled_tasks;
drop policy if exists "Users can create their own tasks" on public.scheduled_tasks;
drop policy if exists "Users can update their own tasks" on public.scheduled_tasks;
drop policy if exists "Users can delete their own tasks" on public.scheduled_tasks;

-- New policies including group sharing
create policy if not exists "Members can view tasks in their groups or own"
on public.scheduled_tasks
for select
to authenticated
using (
  auth.uid() = user_id
  or (group_id is not null and public.is_group_member(group_id))
);

create policy if not exists "Members can create tasks in their groups or own"
on public.scheduled_tasks
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (group_id is null or public.is_group_member(group_id))
);

create policy if not exists "Members can update tasks they own or in their groups"
on public.scheduled_tasks
for update
to authenticated
using (
  auth.uid() = user_id
  or (group_id is not null and public.is_group_member(group_id))
);

create policy if not exists "Members can delete tasks they own or in their groups"
on public.scheduled_tasks
for delete
to authenticated
using (
  auth.uid() = user_id
  or (group_id is not null and public.is_group_member(group_id))
);

create index if not exists idx_scheduled_tasks_group on public.scheduled_tasks(group_id);
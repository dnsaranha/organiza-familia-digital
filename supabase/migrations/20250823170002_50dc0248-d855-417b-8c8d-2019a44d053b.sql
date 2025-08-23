-- Add family groups and update scheduled_tasks for sharing

-- Family groups table
create table public.family_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  join_code text not null unique default substr(encode(gen_random_bytes(16),'hex'),1,8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_groups enable row level security;

create trigger update_family_groups_updated_at
before update on public.family_groups
for each row execute function public.update_scheduled_tasks_updated_at();

-- Group members
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.family_groups(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

alter table public.group_members enable row level security;

create index idx_group_members_group on public.group_members(group_id);
create index idx_group_members_user on public.group_members(user_id);

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

-- Add group_id to scheduled_tasks
alter table public.scheduled_tasks
add column group_id uuid references public.family_groups(id) on delete set null;

create index idx_scheduled_tasks_group on public.scheduled_tasks(group_id);

-- RLS policies for family_groups
create policy "Members can view their groups"
on public.family_groups
for select
to authenticated
using (public.is_group_member(id) or owner_id = auth.uid());

create policy "Users can create groups they own"
on public.family_groups
for insert
to authenticated
with check (owner_id = auth.uid());

-- RLS policies for group_members
create policy "Members can view their group members"
on public.group_members
for select
to authenticated
using (public.is_group_member(group_id));
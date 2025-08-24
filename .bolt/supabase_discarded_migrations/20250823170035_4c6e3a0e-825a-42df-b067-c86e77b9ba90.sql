-- Fix security issues from linter

-- Fix function search path (update existing function)
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

-- Update RLS policies for scheduled_tasks to work with groups
drop policy if exists "Users can view their own tasks" on public.scheduled_tasks;
drop policy if exists "Users can create their own tasks" on public.scheduled_tasks;
drop policy if exists "Users can update their own tasks" on public.scheduled_tasks;
drop policy if exists "Users can delete their own tasks" on public.scheduled_tasks;

create policy "Members can view tasks in their groups or own"
on public.scheduled_tasks
for select
to authenticated
using (
  auth.uid() = user_id
  or (group_id is not null and public.is_group_member(group_id))
);

create policy "Members can create tasks in their groups or own"
on public.scheduled_tasks
for insert
to authenticated
with check (
  auth.uid() = user_id
  and (group_id is null or public.is_group_member(group_id))
);

create policy "Members can update tasks they own or in their groups"
on public.scheduled_tasks
for update
to authenticated
using (
  auth.uid() = user_id
  or (group_id is not null and public.is_group_member(group_id))
);

create policy "Members can delete tasks they own or in their groups"
on public.scheduled_tasks
for delete
to authenticated
using (
  auth.uid() = user_id
  or (group_id is not null and public.is_group_member(group_id))
);
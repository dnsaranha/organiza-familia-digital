-- Fix remaining function search path
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
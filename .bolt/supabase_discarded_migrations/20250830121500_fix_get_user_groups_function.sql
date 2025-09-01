CREATE OR REPLACE FUNCTION public.get_user_groups()
RETURNS TABLE (
  id UUID,
  name TEXT,
  owner_id UUID,
  join_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    fg.id,
    fg.name,
    fg.owner_id,
    fg.join_code,
    fg.created_at,
    fg.updated_at
  FROM public.family_groups fg
  WHERE fg.id IN (
    SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
  );
$$;

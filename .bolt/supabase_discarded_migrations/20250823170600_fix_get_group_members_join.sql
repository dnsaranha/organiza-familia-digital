-- Alter the function to use a LEFT JOIN, ensuring all members are returned
-- even if they don't have a profile entry yet.
CREATE OR REPLACE FUNCTION public.get_group_members(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    gm.user_id as id,
    p.full_name,
    p.avatar_url
  FROM
    public.group_members gm
  LEFT JOIN
    public.profiles p ON gm.user_id = p.id
  WHERE
    gm.group_id = p_group_id;
$$;

-- Add INSERT policy for group_members to allow users to be added to groups.
CREATE POLICY "Users can add themselves to a group"
ON public.group_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create a function to get all groups for the current user (owner or member).
-- This is more reliable than the complex client-side query.
CREATE OR REPLACE FUNCTION public.get_user_groups()
RETURNS SETOF public.family_groups
LANGUAGE sql
STABLE
AS $$
  SELECT fg.*
  FROM public.family_groups fg
  LEFT JOIN public.group_members gm ON fg.id = gm.group_id
  WHERE fg.owner_id = auth.uid() OR gm.user_id = auth.uid()
  GROUP BY fg.id;
$$;

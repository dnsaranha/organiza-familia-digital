-- 1. Enable RLS on the table if it's not already enabled.
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;

-- 2. Define RLS Policies for scheduled_tasks

-- Allow users to see their own tasks or tasks in their groups
CREATE POLICY "Allow users to access their own and group tasks" ON public.scheduled_tasks
  FOR SELECT
  USING (
    (auth.uid() = user_id) OR
    (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
  );

-- Allow users to insert tasks for themselves or for groups they are part of
CREATE POLICY "Allow users to insert their own and group tasks" ON public.scheduled_tasks
  FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id) OR
    (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
  );

-- Allow users to update their own tasks or tasks in their groups
CREATE POLICY "Allow users to update their own and group tasks" ON public.scheduled_tasks
  FOR UPDATE
  USING (
    (auth.uid() = user_id) OR
    (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
  );

-- Allow users to delete their own tasks or tasks in their groups
CREATE POLICY "Allow users to delete their own and group tasks" ON public.scheduled_tasks
  FOR DELETE
  USING (
    (auth.uid() = user_id) OR
    (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
  );

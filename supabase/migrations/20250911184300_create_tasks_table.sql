-- 1. Create the tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    value numeric(10, 2),
    category text,
    scheduled_date timestamptz,
    status text NOT NULL DEFAULT 'pending'::text,
    created_at timestamptz NOT NULL DEFAULT now(),
    is_completed boolean NOT NULL DEFAULT false,
    completed_at timestamptz,
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text])))
);

-- 2. Add comments to the table and columns
COMMENT ON TABLE public.tasks IS 'Stores user-created tasks with optional financial details.';
COMMENT ON COLUMN public.tasks.value IS 'Financial value associated with the task, can be positive (income) or negative (expense).';
COMMENT ON COLUMN public.tasks.status IS 'The current status of the task, e.g., pending, completed.';

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_group_id_idx ON public.tasks(group_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_scheduled_date_idx ON public.tasks(scheduled_date);


-- 4. Set up Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies
-- Allow users to see their own tasks or tasks in their groups
CREATE POLICY "Allow users to access their own and group tasks" ON public.tasks
  FOR SELECT
  USING (
    (auth.uid() = user_id) OR
    (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
  );

-- Allow users to insert tasks for themselves or for groups they are part of
CREATE POLICY "Allow users to insert their own and group tasks" ON public.tasks
  FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id) OR
    (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
  );

-- Allow users to update their own tasks or tasks in their groups
CREATE POLICY "Allow users to update their own and group tasks" ON public.tasks
  FOR UPDATE
  USING (
    (auth.uid() = user_id) OR
    (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
  );

-- Allow users to delete their own tasks or tasks in their groups
CREATE POLICY "Allow users to delete their own and group tasks" ON public.tasks
  FOR DELETE
  USING (
    (auth.uid() = user_id) OR
    (group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid()))
  );

-- 6. Create a trigger to handle task completion
-- When a task is marked as completed, if it has a value, create a transaction.
CREATE OR REPLACE FUNCTION public.handle_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the task is being marked as completed
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    NEW.completed_at = now();
    NEW.status = 'completed';

    -- If there's a value, create a corresponding transaction
    IF NEW.value IS NOT NULL AND NEW.value <> 0 THEN
      INSERT INTO public.transactions (user_id, group_id, type, amount, description, date, category)
      VALUES (
        NEW.user_id,
        NEW.group_id,
        CASE WHEN NEW.value > 0 THEN 'income' ELSE 'expense' END,
        abs(NEW.value),
        'Task completed: ' || NEW.title,
        now(),
        NEW.category
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create a trigger to call the function on update
CREATE TRIGGER on_task_completion
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_task_completion();

-- 1. Add value and category columns to scheduled_tasks table
ALTER TABLE public.scheduled_tasks
ADD COLUMN IF NOT EXISTS value NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Add comments to the new columns
COMMENT ON COLUMN public.scheduled_tasks.value IS 'Financial value associated with the task, can be positive (income) or negative (expense).';
COMMENT ON COLUMN public.scheduled_tasks.category IS 'Category of the task, used for financial tracking.';

-- 3. Create or replace the function to handle task completion
CREATE OR REPLACE FUNCTION public.handle_scheduled_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the task is being marked as completed
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
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

-- 4. Create a trigger to call the function on update
DROP TRIGGER IF EXISTS on_scheduled_task_completion ON public.scheduled_tasks;
CREATE TRIGGER on_scheduled_task_completion
  BEFORE UPDATE ON public.scheduled_tasks
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_scheduled_task_completion();

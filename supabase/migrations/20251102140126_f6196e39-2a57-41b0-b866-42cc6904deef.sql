-- Add recurrence fields to scheduled_tasks table
ALTER TABLE public.scheduled_tasks
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'monthly', 'yearly')),
ADD COLUMN recurrence_interval INTEGER DEFAULT 1,
ADD COLUMN recurrence_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN parent_task_id UUID REFERENCES public.scheduled_tasks(id) ON DELETE CASCADE;

-- Create index for parent_task_id for better performance
CREATE INDEX idx_scheduled_tasks_parent_task_id ON public.scheduled_tasks(parent_task_id);

-- Create index for recurring tasks
CREATE INDEX idx_scheduled_tasks_recurring ON public.scheduled_tasks(is_recurring, schedule_date) WHERE is_recurring = true;
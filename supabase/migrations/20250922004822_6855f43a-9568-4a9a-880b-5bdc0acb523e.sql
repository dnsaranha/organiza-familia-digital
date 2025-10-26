-- Add notified_at column to mark when push notification was sent for a task
ALTER TABLE public.scheduled_tasks
ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ NULL;

-- Helpful index for scheduler queries
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_due
ON public.scheduled_tasks (is_completed, schedule_date, notified_at);

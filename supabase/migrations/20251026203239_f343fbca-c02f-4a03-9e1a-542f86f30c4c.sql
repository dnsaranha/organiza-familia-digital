-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the check-scheduled-tasks edge function to run every minute
SELECT cron.schedule(
  'check-scheduled-tasks-every-minute',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://deipytqxqkmyadabtjnd.supabase.co/functions/v1/check-scheduled-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlaXB5dHF4cWtteWFkYWJ0am5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU3MzY0NzcsImV4cCI6MjA3MTMxMjQ3N30.p4j6kY61Giu3YIE0huyPjxh59JV6lYnOTsenbcyuAUM"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
/*
  # Setup pg_cron for automatic post publishing

  This migration enables the pg_cron extension and creates a cron job
  that calls the check-scheduled Edge Function every minute to automatically
  publish posts when their scheduled_at time is reached.

  1. Extensions
    - Enable pg_cron for scheduled jobs
    - Enable pg_net for HTTP requests from SQL

  2. Cron Job
    - Runs every minute
    - Calls the check-scheduled edge function via HTTP POST
    - Uses the Supabase service role key for authorization
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if present to avoid duplicates
SELECT cron.unschedule('check-scheduled-posts')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-scheduled-posts'
);

-- Schedule the job to run every minute
SELECT cron.schedule(
  'check-scheduled-posts',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/check-scheduled',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := '{}'::jsonb
  )
  $$
);

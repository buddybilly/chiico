/*
  # Fix cron job with hardcoded Supabase URL

  Updates the check-scheduled cron job to use the correct project URL
  and anon key so the HTTP call to the Edge Function works reliably.

  The check-scheduled function uses verify_jwt=false so the anon key is sufficient.
*/

-- Remove existing job
SELECT cron.unschedule('check-scheduled-posts')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-scheduled-posts'
);

-- Recreate with correct URL and anon key
SELECT cron.schedule(
  'check-scheduled-posts',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://cettkysgwetrbrhmusuc.supabase.co/functions/v1/check-scheduled',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldHRreXNnd2V0cmJyaG11c3VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MjE1MTQsImV4cCI6MjA5NTM5NzUxNH0.sMI-RVYmnifSd3ZBR9Pg2JEngpV0meEqk-Chlp4jJPo"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);

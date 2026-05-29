/*
  # Remove foreign key constraints referencing auth.users

  The app uses localStorage UUIDs (no Supabase Auth), so all FK constraints
  referencing auth.users(id) must be removed. The user_id columns are kept
  as plain text/uuid columns for app-level filtering only.
*/

ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
ALTER TABLE public.scheduled_posts DROP CONSTRAINT IF EXISTS scheduled_posts_user_id_fkey;
ALTER TABLE public.gpt_agents DROP CONSTRAINT IF EXISTS gpt_agents_user_id_fkey;
ALTER TABLE public.auto_schedule_slots DROP CONSTRAINT IF EXISTS auto_schedule_slots_user_id_fkey;
ALTER TABLE public.content_plans DROP CONSTRAINT IF EXISTS content_plans_user_id_fkey;
ALTER TABLE public.content_plan_posts DROP CONSTRAINT IF EXISTS content_plan_posts_user_id_fkey;
ALTER TABLE public.post_metrics DROP CONSTRAINT IF EXISTS post_metrics_user_id_fkey;

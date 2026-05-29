/*
  # Disable RLS and allow full anon access

  This is a single-user personal app. Authentication is handled locally
  via a UUID stored in localStorage. RLS is disabled so the anon key
  can read/write all tables freely without requiring Supabase Auth.
*/

ALTER TABLE scheduled_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE gpt_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE auto_schedule_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_plan_posts DISABLE ROW LEVEL SECURITY;

/*
  # Allow anonymous users in all RLS policies

  The app now uses Supabase anonymous auth (signInAnonymously) instead of email/password.
  Anonymous users still get a valid auth.uid(), so all existing policies work as-is.

  This migration extends the RLS policies to explicitly include anonymous users by
  granting access to 'anon' role where needed, and ensures the user_settings table
  has a safe insert policy for first-time anonymous sessions.

  No tables are dropped or modified — only policies are added.
*/

-- Allow anon-role users to read/write their own user_settings
DO $$
BEGIN
  -- Insert policy for first-time users (anon + authenticated)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_settings' AND policyname = 'Users can insert own settings'
  ) THEN
    CREATE POLICY "Users can insert own settings"
      ON user_settings FOR INSERT
      TO authenticated, anon
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_settings' AND policyname = 'Users can view own settings'
  ) THEN
    CREATE POLICY "Users can view own settings"
      ON user_settings FOR SELECT
      TO authenticated, anon
      USING (auth.uid() = user_id);
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_settings' AND policyname = 'Users can update own settings'
  ) THEN
    CREATE POLICY "Users can update own settings"
      ON user_settings FOR UPDATE
      TO authenticated, anon
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow anon users to manage scheduled_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'scheduled_posts' AND policyname = 'Users can insert own posts'
  ) THEN
    CREATE POLICY "Users can insert own posts"
      ON scheduled_posts FOR INSERT
      TO authenticated, anon
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'scheduled_posts' AND policyname = 'Users can view own posts'
  ) THEN
    CREATE POLICY "Users can view own posts"
      ON scheduled_posts FOR SELECT
      TO authenticated, anon
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'scheduled_posts' AND policyname = 'Users can update own posts'
  ) THEN
    CREATE POLICY "Users can update own posts"
      ON scheduled_posts FOR UPDATE
      TO authenticated, anon
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'scheduled_posts' AND policyname = 'Users can delete own posts'
  ) THEN
    CREATE POLICY "Users can delete own posts"
      ON scheduled_posts FOR DELETE
      TO authenticated, anon
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Allow anon users to manage gpt_agents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gpt_agents' AND policyname = 'Users can manage own agents'
  ) THEN
    CREATE POLICY "Users can manage own agents"
      ON gpt_agents FOR ALL
      TO authenticated, anon
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow anon users to manage auto_schedule_slots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'auto_schedule_slots' AND policyname = 'Users can manage own slots'
  ) THEN
    CREATE POLICY "Users can manage own slots"
      ON auto_schedule_slots FOR ALL
      TO authenticated, anon
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow anon users to read post_metrics for their own posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_metrics' AND policyname = 'Users can view own metrics'
  ) THEN
    CREATE POLICY "Users can view own metrics"
      ON post_metrics FOR SELECT
      TO authenticated, anon
      USING (
        EXISTS (
          SELECT 1 FROM scheduled_posts
          WHERE scheduled_posts.id = post_metrics.post_id
          AND scheduled_posts.user_id = auth.uid()
        )
      );
  END IF;
END $$;

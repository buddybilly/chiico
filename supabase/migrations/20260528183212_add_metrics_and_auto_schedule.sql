/*
  # Add Post Metrics and Auto-Schedule Slots

  1. New Tables
    - `post_metrics`
      - `id` uuid primary key
      - `post_id` uuid references scheduled_posts
      - `views` integer (impressions)
      - `likes` integer
      - `comments` integer
      - `reached_500` boolean (alert flag - set when views >= 500)
      - `fetched_at` timestamptz (last metric pull)
    - `auto_schedule_slots`
      - `id` uuid primary key
      - `user_id` uuid references auth.users
      - `time` text (HH:mm format)
      - `post_type` text (story or carousel)
      - `is_active` boolean
      - `created_at` / `updated_at` timestamps

  2. Modified Tables
    - `scheduled_posts` - added `post_type` column (story/carousel)
    - `scheduled_posts` - added `auto_slot` boolean (auto-scheduled flag)

  3. Security
    - RLS on both new tables, user_id-based access
*/

-- post_metrics table
CREATE TABLE IF NOT EXISTS post_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES scheduled_posts(id) ON DELETE CASCADE NOT NULL,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  reached_500 boolean DEFAULT false,
  fetched_at timestamptz DEFAULT now()
);

ALTER TABLE post_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own post metrics"
  ON post_metrics FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM scheduled_posts WHERE scheduled_posts.id = post_metrics.post_id AND scheduled_posts.user_id = auth.uid()));

CREATE POLICY "Users can insert own post metrics"
  ON post_metrics FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM scheduled_posts WHERE scheduled_posts.id = post_metrics.post_id AND scheduled_posts.user_id = auth.uid()));

CREATE POLICY "Users can update own post metrics"
  ON post_metrics FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM scheduled_posts WHERE scheduled_posts.id = post_metrics.post_id AND scheduled_posts.user_id = auth.uid()));

-- auto_schedule_slots table
CREATE TABLE IF NOT EXISTS auto_schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  time text NOT NULL,
  post_type text NOT NULL CHECK (post_type IN ('story', 'carousel')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE auto_schedule_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedule slots"
  ON auto_schedule_slots FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedule slots"
  ON auto_schedule_slots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule slots"
  ON auto_schedule_slots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule slots"
  ON auto_schedule_slots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add post_type and auto_slot to scheduled_posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_posts' AND column_name = 'post_type'
  ) THEN
    ALTER TABLE scheduled_posts ADD COLUMN post_type text DEFAULT 'carousel' CHECK (post_type IN ('story', 'carousel'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'scheduled_posts' AND column_name = 'auto_slot'
  ) THEN
    ALTER TABLE scheduled_posts ADD COLUMN auto_slot boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_post_metrics_post_id ON post_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_auto_schedule_slots_user_id ON auto_schedule_slots(user_id);
CREATE INDEX IF NOT EXISTS idx_auto_schedule_slots_time ON auto_schedule_slots(time);

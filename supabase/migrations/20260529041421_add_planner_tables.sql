/*
  # Add Content Planner Tables

  1. New Tables
    - `content_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `title` (text) — name given to this plan
      - `pillars` (text) — content pillars / topics provided by user
      - `period_days` (int) — number of days in the plan (7, 14, 30 etc.)
      - `start_date` (date) — starting date of the plan
      - `status` (text) — 'generating' | 'ready'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `content_plan_posts`
      - `id` (uuid, primary key)
      - `plan_id` (uuid, FK to content_plans)
      - `user_id` (uuid, FK to auth.users)
      - `day_number` (int) — day index within the plan (1, 2, 3...)
      - `scheduled_date` (date) — actual calendar date
      - `format` (text) — 'post' | 'carrossel' | 'story' | 'reels'
      - `theme` (text) — the post theme/title
      - `emotional_angle` (text) — emotional hook for the post
      - `caption_suggestion` (text) — brief caption suggestion
      - `cta` (text) — premium CTA suggestion
      - `hashtags` (text[]) — suggested hashtags
      - `pillar` (text) — which content pillar this belongs to
      - `status` (text) — 'pending' | 'in_progress' | 'done'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own plans and plan posts
*/

CREATE TABLE IF NOT EXISTS content_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  pillars text NOT NULL DEFAULT '',
  period_days int NOT NULL DEFAULT 30,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own plans"
  ON content_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON content_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON content_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans"
  ON content_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS content_plan_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES content_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number int NOT NULL DEFAULT 1,
  scheduled_date date,
  format text NOT NULL DEFAULT 'post',
  theme text NOT NULL DEFAULT '',
  emotional_angle text NOT NULL DEFAULT '',
  caption_suggestion text NOT NULL DEFAULT '',
  cta text NOT NULL DEFAULT '',
  hashtags text[] DEFAULT '{}',
  pillar text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE content_plan_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own plan posts"
  ON content_plan_posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan posts"
  ON content_plan_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan posts"
  ON content_plan_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own plan posts"
  ON content_plan_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
